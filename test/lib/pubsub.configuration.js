'use strict';

/* jshint -W030 */

var should  = require('should')
  , PubSub  = require('../../index')
  , helper  = require('../helper')

describe('Publish-Subscribe', function() {

    var pubsub, socket, xmpp, manager

    before(function() {
        socket = new helper.SocketEventer()
        xmpp = new helper.XmppEventer()
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

    beforeEach(function() {
        socket.removeAllListeners()
        xmpp.removeAllListeners()
        pubsub.init(manager)
    })

    describe('Get configuration', function() {

        it('Errors when no callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing callback')
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            console.log(socket, xmpp)
            socket.send('xmpp.pubsub.config.get', {})
        })

        it('Errors when non-function callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing callback')
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.send('xmpp.pubsub.config.get', {}, true)
        })

        it('Errors if missing \'to\' key', function(done) {
            var request = {}
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'to\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.send(
                'xmpp.pubsub.config.get',
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
                error.description.should.equal('Missing \'node\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.send(
                'xmpp.pubsub.config.get',
                request,
                callback
            )
        })

        it('Sends expected stanza', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.id.should.exist
                stanza.attrs.type.should.equal('get')
                var configure = stanza.getChild('pubsub', pubsub.NS_OWNER)
                    .getChild('configure')
                configure.should.exist
                configure.attrs.node.should.equal(request.node)
                done()
            })
            socket.send(
                'xmpp.pubsub.config.get',
                request,
                function() {}
            )
        })

        it('Handles error response stanza', function(done) {
            xmpp.once('stanza', function() {
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
                node: 'twelfth night'
            }
            socket.send('xmpp.pubsub.config.get', request, callback)
        })

        it('Returns configuration data', function(done) {
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('configuration'))
            })
            var callback = function(error, data) {
                should.not.exist(error)
                data.fields.length.should.equal(2)
                data.fields[0].var.should.equal('pubsub#title')
                data.fields[0].type.should.equal('text-single')
                data.fields[0].label.should.equal('News about a funny play')
                data.fields[1].var.should.equal('pubsub#deliver_notifications')
                data.fields[1].type.should.equal('boolean')
                data.fields[1].label.should.equal('Send notifications?')
                data.fields[1].value.should.be.true
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            socket.send('xmpp.pubsub.config.get', request, callback)
        })

    })

    describe('Set configuration', function() {

        beforeEach(function() {
            xmpp.removeAllListeners('stanza')
        })

        it('Errors when no callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing callback')
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.send('xmpp.pubsub.config.set', {})
        })

        it('Errors when non-function callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing callback')
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.send('xmpp.pubsub.config.set', {}, true)
        })

        it('Errors if missing \'to\' key', function(done) {
            var request = {}
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'to\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.send('xmpp.pubsub.config.set', request, callback)

        })

        it('Errors if missing \'node\' key', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit'
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'node\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.send('xmpp.pubsub.config.set', request, callback)

        })

        it('Errors if missing \'form\' key', function(done) {
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
                error.description.should.equal('Missing \'form\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.send('xmpp.pubsub.config.set', request, callback)
        })

        it('Errors if unparsable data form provided', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                form: true
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Badly formatted data form')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.send('xmpp.pubsub.config.set', request, callback)
        })

        it('Sends expected stanza', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                form: [
                    { var: 'pubsub#title', value: 'A great comedy' }
                ]
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.id.should.exist
                stanza.attrs.type.should.equal('set')
                var configure = stanza.getChild('pubsub', pubsub.NS_OWNER)
                    .getChild('configure')
                configure.should.exist
                configure.attrs.node.should.equal(request.node)
                var form = configure.getChild('x', 'jabber:x:data')
                form.should.exist
                form.attrs.type.should.equal('submit')
                form.children.length.should.equal(2)
                form.children[0].attrs.var.should.equal('FORM_TYPE')
                form.children[0].attrs.type.should.equal('hidden')
                form.children[0].getChildText('value')
                    .should.equal(pubsub.NS_CONFIG)
                form.children[1].attrs.var.should.equal('pubsub#title')
                form.children[1].getChildText('value')
                    .should.equal('A great comedy')
                done()
            })
            socket.send('xmpp.pubsub.config.set', request, function() {})
        })

        it('Handles error response stanza', function(done) {
            xmpp.once('stanza', function() {
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
                form: []
            }
            socket.send('xmpp.pubsub.config.set', request, callback)
        })

        it('Returns true on success', function(done) {
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('iq-result'))
            })
            var callback = function(error, success) {
                should.not.exist(error)
                success.should.be.true
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                form: []
            }
            socket.send('xmpp.pubsub.config.set', request, callback)
        })

    })

})
