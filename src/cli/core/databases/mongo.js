const config = require('../config/config.js');
const MongoClient = require('mongodb').MongoClient;

// Connection URL
const url = config.default.database.mongo.url;

const options = {
    useNewUrlParser: true,
    poolSize: 10,
};

var _db;

module.exports = {

  connectToServer: function( callback ) {
    if (!url) { return callback('Missing mongo URL')}
    MongoClient.connect( url, options, function( err, client ) {
      _db = client.db('abecms_dev');
      return callback( err );
    } );
  },

  getDb: function() {
    return _db;
  }
};
