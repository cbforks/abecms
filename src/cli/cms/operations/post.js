import path from 'path'

import {
  cmsData,
  Page,
  cmsOperations,
  cmsTemplates,
  coreUtils,
  config,
  abeExtend,
  Manager
} from '../../'

export async function draft(postUrl, json, workflow = 'draft', user) {
  var p = new Promise(resolve => {
    abeExtend.hooks.instance.trigger('beforeDraft', json, postUrl)

    const docPath = cmsData.utils.getDocPathFromPostUrl(postUrl)
    const revisionPath = coreUtils.file.addDateIsoToRevisionPath(
      docPath,
      workflow
    )
    const date = coreUtils.file.getDate(revisionPath)
    cmsData.metas.add(json, workflow, date, user)

    const template = cmsTemplates.template.getTemplate(
      json.abe_meta.template, // id template why json *2 ? 
      json
    )

    cmsData.source.getDataList(template, json).then(async () => {
      json['abe_meta'].complete = cmsData.utils.getPercentOfRequiredTagsFilled( // force required fields
        template,
        json
      )

      var result
      if (!await cmsOperations.save.saveJson(revisionPath, json)) {
        result = {
          success: 0,
          error: 'cannot json save file'
        }
      } else {
        Manager.instance.updatePostInList(revisionPath)
        result = {
          success: 1,
          json: json
        }
      }
      resolve(result)
    })
  })

  return p
}

export function publish(postUrl, json, user) {
  var p = new Promise(resolve => {
    abeExtend.hooks.instance.trigger('beforePublish', json, postUrl)

    const docPath = cmsData.utils.getDocPathFromPostUrl(postUrl)
    const postPath = path.join(Manager.instance.pathPublish, postUrl)
    cmsData.metas.add(json, 'publish', null, user)

    var template = cmsTemplates.template.getTemplate(
      json.abe_meta.template,
      json
    )

    cmsData.source.getDataList(template, json).then(async () => {
      json['abe_meta'].complete = cmsData.utils.getPercentOfRequiredTagsFilled(
        template,
        json
      )

      var page = new Page(template, json, true)

      var result
      if (!cmsOperations.save.saveHtml(postPath, page.html)) {
        result = {
          success: 0,
          error: 'cannot save html file'
        }
      } else {
        if (!await cmsOperations.save.saveJson(docPath, json)) {
          result = {
            success: 0,
            error: 'cannot save json file'
          }
        } else {
          Manager.instance.updatePostInList(docPath)
          abeExtend.hooks.instance.trigger('afterPublish', json, postUrl)
          result = {
            success: 1,
            json: json
          }
        }
      }
      // are there additional templates to export?
      if (json.abe_meta.relatedTemplates) {
        Object.keys(json.abe_meta.relatedTemplates).map(function(key, index) {
          const relatedTemplate = json.abe_meta.relatedTemplates[key]

          if (relatedTemplate.template && relatedTemplate.path) {
            const relTemplate = cmsTemplates.template.getTemplate(
              relatedTemplate.template,
              json
            )
            let extension = config.files.templates.extension
            if (relatedTemplate.extension) extension = relatedTemplate.extension
            const fileName =
              path.basename(postUrl, '.' + config.files.templates.extension) +
              '.' +
              extension
            const relPath = path.join(
              Manager.instance.pathPublish,
              relatedTemplate.path,
              fileName
            )

            cmsData.source.getDataList(relTemplate, json).then(() => {
              const page = new Page(relTemplate, json, true)
              cmsOperations.save.saveHtml(relPath, page.html)
              resolve()
            })
          }
        })
      }

      resolve(result)
    })
  })

  return p
}

export function unpublish(postUrl, user) {
  abeExtend.hooks.instance.trigger('beforeUnpublish', postUrl)

  var p = new Promise((resolve, reject) => {
    const docPath = cmsData.utils.getDocPathFromPostUrl(postUrl)
    const postPath = path.join(Manager.instance.pathPublish, postUrl)
    if (coreUtils.file.exist(docPath)) {
      var json = cmsData.file.get(docPath)
      if (json.abe_meta.publish != null) {
        delete json.abe_meta.publish
      }

      var p = cmsOperations.post.draft(postUrl, json, 'draft', user)

      p
        .then(result => {
          cmsOperations.remove.removeRevision(docPath)
          cmsOperations.remove.removePost(postPath)
          // are there additional templates to export?
          if (result.json.abe_meta.relatedTemplates) {
            Object.keys(result.json.abe_meta.relatedTemplates).map(function(
              key,
              index
            ) {
              const relatedTemplate = result.json.abe_meta.relatedTemplates[key]

              if (relatedTemplate.template && relatedTemplate.path) {
                const relTemplate = cmsTemplates.template.getTemplate(
                  relatedTemplate.template,
                  json
                )
                let extension = config.files.templates.extension
                if (relatedTemplate.extension)
                  extension = relatedTemplate.extension
                const fileName =
                  path.basename(
                    postUrl,
                    '.' + config.files.templates.extension
                  ) +
                  '.' +
                  extension
                const relPath = path.join(
                  Manager.instance.pathPublish,
                  relatedTemplate.path,
                  fileName
                )
                cmsOperations.remove.removeFile(relPath)
              }
            })
          }

          const newDocPath = cmsData.utils.getDocPathFromLinkStatusDate(
            result.json
          )
          Manager.instance.updatePostInList(newDocPath)

          abeExtend.hooks.instance.trigger(
            'afterUnpublish',
            docPath,
            postPath,
            result.json
          )

          resolve(result)
        })
        .catch(function(e) {
          console.error('[ERROR] unpublish', e)
          reject()
        })
    }
  })

  return p
}

export function submit(postUrl, json, workflow, user) {
  var p
  if (workflow === 'publish') {
    p = cmsOperations.post.publish(postUrl, json, user)
  } else {
    p = cmsOperations.post.draft(postUrl, json, workflow, user)
  }

  return p
}

export function reject(filePath, json, workflow, user) {
  abeExtend.hooks.instance.trigger('beforeReject', filePath)

  var rejectToWorkflow
  var found = false
  Array.prototype.forEach.call(config.users.workflow, flow => {
    if (workflow === flow) {
      found = true
    }
    if (!found) {
      rejectToWorkflow = flow
    }
  })
  if (!found) {
    rejectToWorkflow = 'draft'
  }

  var p = new Promise(resolve => {
    if (json.abe_meta.publish != null) {
      delete json.abe_meta.publish
    }
    var p2 = cmsOperations.post.draft(filePath, json, rejectToWorkflow, user)
    p2
      .then(result => {
        abeExtend.hooks.instance.trigger('afterReject', result)
        resolve(result)
      })
      .catch(function(e) {
        console.error('[ERROR] reject.js', e)
      })
  })

  return p
}
