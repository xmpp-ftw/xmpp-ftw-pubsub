var should  = require('should')
  , PubSub  = require('../../lib/pubsub')
  , ltx     = require('ltx')
  , helper  = require('../helper')

describe('Publish-Subscribe', function() {

    var pubsub, socket, xmpp, manager

    before(function() {
        socket = new helper.Eventer()
        xmpp = new helper.Eventer()
        manager = {
            socket: socket,
            client: xmpp,
            trackId: function(id, callback) {
                this.callback = callback
            },
            makeCallback: function(error, data) {
                this.callback(error, data)
            }
        }
        pubsub = new PubSub()
        pubsub.init(manager)
    })

    describe('Get configuration', function() {

        it('Errors if missing \'to\' key', function(done) {
            done('Not implemented yet')
        })

        it('Errors if \'node\' key missing', function(done) {

            done('Not implemented yet')
        })

        it('Sends expected stanza', function(done) {

             done('Not implemented yet')

        })

        it('Handles error response stanza', function(done) {

            done('Not implemented yet')
        })

        it('Returns configuration data', function(done) {
            done('Not implemented yet')
        })   

    })

    describe('Set configuration', function() {

 

    })

})
