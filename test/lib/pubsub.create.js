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

    describe('Node creation', function() {

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
            socket.send('xmpp.pubsub.create', {})
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
            socket.send('xmpp.pubsub.create', {}, true)
        })

        it('Returns error if \'to\' key not provided', function(done) {
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
            var request = {}
            socket.send('xmpp.pubsub.create', request, callback)
        })

        it('Returns error if \'node\' key not provided', function(done) {
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
            socket.send('xmpp.pubsub.create', request, callback)
        })

        it('Handles an error stanza response', function(done) {
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
            socket.send(
                'xmpp.pubsub.create',
                request,
                callback
            )
        })

        it('Successfully handles simple node creation', function(done) {
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.type.should.equal('set')
                stanza.attrs.to.should.equal(request.to)
                should.exist(stanza.attrs.id)
                stanza.getChild('pubsub', pubsub.NS_PUBSUB).should.exist
                var create = stanza.getChild('pubsub').getChild('create')
                create.attrs.node.should.equal(request.node)
                manager.makeCallback(helper.getStanza('iq-result'))
            })
            var callback = function(error, success) {
                should.not.exist(error)
                success.should.be.true
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            socket.send(
                'xmpp.pubsub.create',
                request,
                callback
            )
        })

        it('Returns error if invalid data form provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.should.eql({
                    type: 'modify',
                    condition: 'client-error',
                    description: 'Badly formatted data form',
                    request: request
                })
                xmpp.removeAllListeners('stanza')
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                options: {}
            }
            socket.send(
                'xmpp.pubsub.create',
                request,
                callback
            )
        })

        it('Allows advanced node creation', function(done) {
            xmpp.once('stanza', function(stanza) {
                stanza.getChild('pubsub').getChild('create').should.exist
                var dataForm = stanza.getChild('pubsub')
                    .getChild('configure')
                    .getChild('x', 'jabber:x:data')
                dataForm.should.exist
                dataForm.attrs.type.should.equal('submit')
                var fields = dataForm.children
                fields[0].name.should.equal('field')
                fields[0].attrs.var.should.equal('FORM_TYPE')
                fields[0].attrs.type.should.equal('hidden')
                fields[0].getChild('value').getText()
                    .should.equal(pubsub.NS_CONFIG)
                fields[1].attrs.var.should.equal(request.options[0].var)
                fields[1].getChild('value').getText()
                    .should.equal(request.options[0].value)
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
                options: [{
                    var: 'pubsub#description',
                    value: 'A new comedy'
                }]
            }
            socket.send(
                'xmpp.pubsub.create',
                request,
                callback
            )
        })

    })

    describe('Node deletion', function() {

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
            socket.send('xmpp.pubsub.delete', {})
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
            socket.send('xmpp.pubsub.delete', {}, true)
        })

        it('Errors if no \'to\' key', function(done) {
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
            socket.send('xmpp.pubsub.delete', request, callback)
        })

        it('Errors if no \'node\' key', function(done) {
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
            socket.send('xmpp.pubsub.delete', request, callback)
        })

        it('Sends expected stanza', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('set')
                stanza.attrs.id.should.exist
                stanza.getChild('pubsub', pubsub.NS_PUBSUB).should.exist
                var pubsubElement = stanza.getChild('pubsub')
                pubsubElement.getChild('delete').should.exist
                pubsubElement.getChild('delete').attrs.node
                    .should.equal(request.node)
                done()
            })
            socket.send('xmpp.pubsub.delete', request, function() {})
        })

        it('Sends redirect element if requested', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                redirect: 'xmpp:pubsub.shakespeare.lit?;node=hamlet'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.getChild('pubsub')
                    .getChild('delete')
                    .getChild('redirect')
                    .attrs.uri
                    .should.equal(request.redirect)
                done()
            })
            socket.send('xmpp.pubsub.delete', request, function() {})
        })

        it('Handles an error stanza response', function(done) {
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
            socket.send(
                'xmpp.pubsub.delete',
                request,
                callback
            )
        })

        it('Successful response handled ok', function(done) {
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
                node: 'twelfth night'
            }
            socket.send(
                'xmpp.pubsub.delete',
                request,
                callback
            )
        })

    })
})
