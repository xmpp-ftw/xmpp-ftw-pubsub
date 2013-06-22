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

    describe('Publishing items', function() {

        it('Errors if \'to\' key missing', function(done) {
            done('Not implemented yet')
        })
 
        it('Errors if \'node\' key missing', function(done) {
            done('Not implemented yet')
        })

        it('Errors if no message content', function(done) {
            done('Not implemented yet')
        })
 
        it('Errors if empty message content', function(done) {

        })

        it('Returns error if item content can be built', function(done) {
            done('Not implemented yet')
        })

        it('Errors if publish options can\'t be parsed', function(done) {
            done('Not implemented yet')
        })

        it('Sends expected stanza', function(done) {
           done('Not implemented yet')
        })

        it('Sends expected stanza with set ID', function(done) {
           done('Not implemented yet') 
        })

        it('Sends expected stanza with publish options', function(done) {
           done('Not implemented yet')
        })

        it('Handles error stanza response', function(done) {
            done('Not implemented yet')
        })

        it('Returns post ID on success', function(done) {

        })

    })

    describe('Retrieving node items', function() {

    })

    describe('Deleting node items', function() {

    })

    describe('Purging a node', function() {

    })
})
