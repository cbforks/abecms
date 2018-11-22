/*global document, window, $, Event */

import {Devtool} from './devtool/Devtool'

import EditorInputs from './modules/EditorInputs'
import EditorBlock from './modules/EditorBlock'
import EditorFiles from './modules/EditorFiles'
import EditorSave from './modules/EditorSave'
import EditorJson from './modules/EditorJson'
import EditorManager from './modules/EditorManager'
import EditorAutocomplete from './modules/EditorAutocomplete'
import EditorReload from './modules/EditorReload'
import EditorReferences from './modules/EditorReferences'
import EditorStructures from './modules/EditorStructures'
import TaskRepublish from './modules/TaskRepublish'
import EditorThemes from './modules/EditorThemes'
import EditorBuildTemplate from './modules/EditorBuildTemplate'
import Nanoajax from 'nanoajax'

var htmlTag = document.querySelector('html')
window.CONFIG = JSON.parse(htmlTag.getAttribute('data-config'))
// window.json = JSON.parse(unescape(htmlTag.getAttribute('data-json').replace(/&quot;/g, '\"')))
var j = htmlTag.getAttribute('data-json')
if (j != null) {
  j = j.replace(/&quot;/g, '"')
  j = unescape(j)
  j = j.replace(/\%27/g, "'")
  window.json = JSON.parse(j)
} else {
  window.json = {}
}
var l = htmlTag.getAttribute('data-locales')
if (l != null) {
  window.Locales = JSON.parse(l)
} else {
  window.Locales = {}
}
var s = htmlTag.getAttribute('data-slugs')
if (s != null) {
  window.slugs = JSON.parse(s)
} else {
  window.slugs = {}
}

class Engine {
  constructor() {
    this._blocks = new EditorBlock()
    this._inputs = new EditorInputs()
    this._files = new EditorFiles()
    this._save = new EditorSave()
    this._manager = new EditorManager()
    this._autocomplete = new EditorAutocomplete()
    this._dev = new Devtool()
    this.reference = new EditorReferences()
    this.structure = new EditorStructures()
    this.republish = new TaskRepublish()
    this.themes = new EditorThemes()
    this.buildTemplate = new EditorBuildTemplate()

    this.json = EditorJson.instance

    this._bindEvents()

    this.table = null
    this.columns = [
      {
        data: null,
        defaultContent: '',
        orderable: false
      },
      {
        data: 'abe_meta.link'
      },
      {
        data: 'abe_meta.template'
      },
      {
        data: null,
        defaultContent: ''
      }
    ]

    if (typeof workflow != 'undefined' && workflow !== null) {
      Array.prototype.forEach.call(workflow, flow => {
        this.columns.push({
          data: null,
          defaultContent: '',
          orderable: false
        })
      })
    }

    this.columns.push({
      data: null,
      defaultContent: '',
      orderable: false
    })

    $(document).ready(() => {
      if (document.querySelector('#navigation-list') != null) {
        this.table = $('#navigation-list').DataTable({
          lengthChange: false,
          pageLength: 50,
          processing: true,
          serverSide: true,
          ajax: '/abe/api/pages/paginate',
          columns: this.columns,
          order: [[3, 'desc']],
          stateSave: true,
          drawCallback: function(settings) {
            window.abe.manager.rebind()
          },
          stateSaveCallback: function(settings, data) {
            localStorage.setItem(
              'DataTables_' + settings.sInstance,
              JSON.stringify(data)
            )
          },
          stateLoadCallback: function(settings) {
            let params = JSON.parse(
              localStorage.getItem('DataTables_' + settings.sInstance)
            )
            if (params) $('#abeSearch').val(params.search.search)
            return params
          },
          createdRow: function(row, data, index) {
            var actions = '<div class="row icons-action">'
            if (data.publish != null) {
              actions += `<a href="/abe/api/pages/unpublish${data.abe_meta.link}"
                   title="Unpublish"
                   class="icon" data-unpublish="true" data-text="Are you sure you want to unpublish : ${data
                     .abe_meta.link}"
                   title="unpublish">
                  <span class="fas fa-eye-slash"></span>
                </a>`
            }

            actions += `<a href="${data.abe_meta.status}${data.abe_meta.link}"
                 title="Delete"
                 class="icon"
                 data-delete="true"
                 data-text="Are you sure you want to delete : ${data.abe_meta
                   .link}"
                 title="remove">
                <span class="fas fa-trash"></span>
              </a></div>`

            var i = 4
            Array.prototype.forEach.call(workflow, flow => {
              var wkf = ''
              if (typeof data[flow] !== 'undefined' && flow === 'publish') {
                var fDate = moment(data[flow].date).format(
                  'YYYY-MM-DD HH:mm:ss'
                )
                wkf = `<a href="/abe/editor${data[flow]
                  .link}" class="checkmark label-published" title="${fDate}">&#10004;</a>`
              }
              if (data.abe_meta.status == flow && flow !== 'publish') {
                var fDate = moment(data[flow].date).format(
                  'YYYY-MM-DD HH:mm:ss'
                )
                wkf = `<a href="/abe/editor${data[flow]
                  .link}" class="label label-default label-draft" title="${fDate}">${flow}</a>`
              }
              $('td', row).eq(i).html(wkf)
              ++i
            })

            $('td', row).eq(0).html(index + 1)
            $('td', row)
              .eq(1)
              .html(
                '<a href="/abe/editor' +
                  data.abe_meta.link +
                  '" class="file-path" title="' +
                  (typeof data.name !== 'undefined'
                    ? data.name
                    : data.abe_meta.link) +
                  '">' +
                  data.abe_meta.link +
                  '</a>'
              )
            $('td', row).eq(3).html(moment(data.date).format('YYYY/MM/DD'))
            $('td', row).eq(i).html(actions)
          }
        })
      }
      $('#navigation-list').on('processing.dt', function(
        e,
        settings,
        processing
      ) {
        $('#navigation-list_processing')
          .css('display', processing ? 'block' : 'none')
          .css({top: '150px'})
      })
      $('#navigation-list').on('draw.dt', function(e, settings, data) {
        $('#navigation-list_filter').css('display', 'none')
      })
      $('#navigation-list').on('preXhr.dt', function(e, settings, data) {
        if (settings.jqXHR) {
          settings.jqXHR.abort()
        }
      })
    })

    var abeReady = new Event('abeReady')
    document.dispatchEvent(abeReady)
  }

  inject() {
    var findComments = function(el) {
      var arr = []
      for (var i = 0; i < el.childNodes.length; i++) {
        var node = el.childNodes[i]
        if (node.nodeType === 8) {
          arr.push(node)
        } else {
          arr.push.apply(arr, findComments(node))
        }
      }
      return arr
    }

    var commentNodes = findComments(document)

    Array.prototype.forEach.call(commentNodes, comment => {
      if (comment.nodeValue.indexOf('[pageHTML]') > -1) {
        var base = comment.data
        if (typeof base !== 'undefined' && base !== null) {
          base = base.replace(/\[pageHTML\]/g, '')
          base = base.replace(/<ABE!--/g, '<!--').replace(/--ABE>/g, '-->')
          base = base.replace(/<\/body>/g, '<script src="/abecms/libs/clickEditor.js"></script></body>')
          EditorReload.instance.inject(base)
        }
      }
    })
  }

  _bindEvents() {
    this._blocks.onNewBlock(() => {
      this._files.rebind()
      this._inputs.rebind()
      this._autocomplete.rebind()
    })

    this._blocks.onMoveBlock(() => {
      this._files.rebind()
      this._inputs.rebind()
      this._autocomplete.rebind()
      this._save.serializeForm()
      EditorReload.instance.reload()
    })

    this._manager.remove(el => {
      this.table.ajax.reload()
    })

    this._inputs.onReload(() => {
      this._save.serializeForm()
      EditorReload.instance.reload()
    })

    this._autocomplete.onReload(() => {
      EditorReload.instance.reload()
    })

    this._inputs.onBlur(() => {
      this._save.serializeForm()
    })

    this._blocks.onRemoveBlock(() => {
      this._inputs.rebind()
      this._autocomplete.rebind()
      this._save.serializeForm() ///**************************************** HOOLA
    })
  }
}

var engine = new Engine()
window.abe = {
  save: engine._save,
  json: engine.json,
  inputs: engine._inputs,
  files: engine._files,
  manager: engine._manager,
  blocks: engine._blocks,
  autocomplete: engine._autocomplete,
  editorReload: EditorReload
}

document.addEventListener('DOMContentLoaded', function() {
  if (document.querySelector('#page-template')) engine.inject()
  $('#abeSearch').on('keyup', function() {
    engine.table.search(this.value).draw()
  })
  $(document).on('click', '.savedSearches', function () {
    $('#abeSearch').val($(this).data('search'))
    engine.table.search($('#abeSearch').val()).draw();
  });
  $('#save-search').on('submit', function (e) {
    e.preventDefault()
    $('#saveSearchValue').val($('#abeSearch').val())
    Nanoajax.ajax(
      {
        url: $(this).attr('action'),
        body: $(this).serialize(),
        cors: true,
        method: $(this).attr('method')
      },
      (code, responseText) => {
        var res = JSON.parse(responseText)
        if (res && res.success) {
          var $newEl = $( `<div class="btn-group btn-group-sm" role="group" aria-label="Small button group" style="margin-right: 20px;">
          <button type="button" data-id="${$('#saveSearchId').val()}" data-search="${$('#saveSearchValue').val()}" data-title="${$('#saveSearchTitle').val()}" class="btn btn-secondary savedSearches">${$('#saveSearchTitle').val()}</button>
          <button type="button" data-id="${$('#saveSearchId').val()}" data-search="${$('#saveSearchValue').val()}" data-title="${$('#saveSearchTitle').val()}" class="btn btn-danger removeSearches">X</button>
        </div>` )
          $('.jsSavedSearches').append($newEl)
        }
      }
    )
  });
  $(document).on('click', '.removeSearches', function (e) {
    e.preventDefault();
    Nanoajax.ajax(
      {
        url: '/abe/users/remove-search',
        body: `title=${$(this).data('title')}&id=${$(this).data('id')}&search=${$(this).data('search')}`,
        cors: true,
        method: 'POST'
      },
      (code, responseText) => {
        var res = JSON.parse(responseText)
        if (res && res.success) {
          $(this).parent().remove()
        }
      }
    )
  });
})
