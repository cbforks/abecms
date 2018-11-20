import pkg from '../../../../../package'
import fs from 'fs-extra'
import path from 'path'

import {coreUtils, config, Handlebars, User} from '../../../../cli'

var route = function route(req, res) {
  var resHtml = ''

  // TODO-USERS
  var page = path.join(__dirname + '/../../../views/users-list.html')
  if (coreUtils.file.exist(page)) {
    resHtml = fs.readFileSync(page, 'utf8')
  }

  var template = Handlebars.compile(resHtml, {noEscape: true})

  var roles = config.users.roles
  var tmp = template({
    users: User.utils.getAll(),
    user: res.user,
    config: config,
    roles: roles,
    isMembers: true,
    manager: {
      config: JSON.stringify(config)
    },
    abeVersion: pkg.version
  })

  return res.send(tmp)
}

export default route
