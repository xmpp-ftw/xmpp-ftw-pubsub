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
            var request = {}
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing 'to' key")
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.pubsub.publish',
                request,
                callback
            )
        })
 
        it('Errors if \'node\' key missing', function(done) {
            var request = { to: 'pubsub.shakespeare.lit' }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing 'node' key")
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.pubsub.publish',
                request,
                callback
            )

        })

        it('Errors if no message key', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing message content")
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.pubsub.publish',
                request,
                callback
            )
        })
 
        it('Errors if empty message content', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                content: ''
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing message content")
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.pubsub.publish',
                request,
                callback
            )
        })

        it('Returns error if item content can be built', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                content: 'hello world'
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description
                    .should.equal("Could not parse content to stanza")
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                pubsub.setItemParser()
                done()
            }
             
            pubsub.setItemParser(helper.failingItemParser)
            socket.emit(
                'xmpp.pubsub.publish',
                request,
                callback
            )
        })

        it('Errors if publish options can\'t be parsed', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                content: 'hello world',
                options: true
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description
                    .should.equal("Badly formatted data form")
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }

            socket.emit(
                'xmpp.pubsub.publish',
                request,
                callback
            )
        })

        it('Sends expected stanza', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                content: 'hello world'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.id.should.exist
                stanza.attrs.type.should.equal('set')
                var publish = stanza.getChild('pubsub', pubsub.NS_PUBSUB)
                    .getChild('publish')
                publish.should.exist
                publish.attrs.node.should.equal(request.node)
                publish.getChild('item').children.length.should.equal(1)
                publish.getChild('item').getChildText('body')
                    .should.equal(request.content)
                done()
            })
            socket.emit(
                'xmpp.pubsub.publish',
                request,
                function() {}
            )
        })

        it('Sends expected stanza with set ID', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                content: 'hello world',
                id: '111'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.getChild('pubsub', pubsub.NS_PUBSUB)
                    .getChild('publish').getChild('item').attrs.id
                    .should.equal(request.id)
                done()
            })
            socket.emit(
                'xmpp.pubsub.publish',
                request,
                function() {}
            )
        })

        it('Sends expected stanza with publish options', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                content: 'hello world',
                options: [
                    { var: 'pubsub#access_model', value: 'presence' }
                ]
            }
            xmpp.once('stanza', function(stanza) {
                var dataForm = stanza.getChild('pubsub', pubsub.NS_PUBSUB)
                    .getChild('publish-options')
                    .getChild('x', 'jabber:x:data')
                dataForm.should.exist
                dataForm.attrs.type.should.equal('submit')
                dataForm.children.length.should.equal(2)
                dataForm.children[0].attrs.var.should.equal('FORM_TYPE')
                dataForm.children[0].attrs.type.should.equal('hidden')
                dataForm.children[0].name.should.equal('field')
                dataForm.children[0].getChildText('value')
                    .should.equal(pubsub.NS_PUBLISH_OPTIONS)
                dataForm.children[1].name.should.equal('field')
                dataForm.children[1].attrs.var
                    .should.equal('pubsub#access_model')
                dataForm.children[1].getChildText('value')
                    .should.equal('presence')
                done()
            })
            socket.emit(
                'xmpp.pubsub.publish',
                request,
                function() {}
            )
        })

        it('Handles error stanza response', function(done) {
            xmpp.once('stanza', function(stanza) {
                manager.makeCallback(helper.getStanza('iq-error'))
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.should.eql({
                    type: 'cancel',
                    condition: 'error-condition'
                })
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                content: 'hello world'
            }
            socket.emit(
                'xmpp.pubsub.publish',
                request,
                callback
            )
        })

        it('Returns post ID on success', function(done) {
            xmpp.once('stanza', function(stanza) {
                manager.makeCallback(helper.getStanza('publish'))
            })
            var callback = function(error, success) {
                should.not.exist(error)
                success.id.should.equal('123456')
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                content: 'hello world'
            }
            socket.emit(
                'xmpp.pubsub.publish',
                request,
                callback
            )
        })

    })

    describe('Retrieving node items', function() {

    })

    describe('Deleting node items', function() {

    })

    describe('Purging a node', function() {

    })
})
