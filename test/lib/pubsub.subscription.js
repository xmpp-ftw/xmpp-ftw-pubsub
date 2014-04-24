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
                if (typeof id !== 'object')
                    throw new Error('Stanza protection ID not added')
                this.callback = callback
            },
            makeCallback: function(error, data) {
                this.callback(error, data)
            },
            jid: 'juliet@example.net'
        }
        pubsub = new PubSub()
        pubsub.init(manager)
    })

    beforeEach(function() {
        socket.removeAllListeners()
        xmpp.removeAllListeners()
        pubsub.init(manager)
    })

    describe('Subscription', function() {

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
            socket.send('xmpp.pubsub.subscription', {})
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
            socket.send('xmpp.pubsub.subscription', {}, true)
        })

        it('Errors if no \'to\' key provided', function(done) {
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
            socket.send('xmpp.pubsub.subscription', request, callback)
        })

        it('Errors if no \'node\' key provided', function(done) {
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
            socket.send('xmpp.pubsub.subscription', request, callback)
        })

        it('Errors if no \'jid\' key provided', function(done) {
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
                error.description.should.equal('Missing \'jid\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.send('xmpp.pubsub.subscription', request, callback)
        })

        it('Errors if no \'subscription\' key provided', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                jid: 'juliet@shakespeare.lit'
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'subscription\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.send('xmpp.pubsub.subscription', request, callback)
        })

        it('Sends expected stanza', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                jid: 'juliet@shakespeare.lit',
                subscription: 'subscribed'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('set')
                stanza.attrs.id.should.exist
                stanza.getChild('pubsub', pubsub.NS_OWNER).should.exist
                var subscriptions = stanza.getChild('pubsub')
                    .getChild('subscriptions')
                subscriptions.should.exist
                subscriptions.attrs.node.should.equal(request.node)

                var subscription = subscriptions.getChild('subscription')
                subscription.attrs.jid.should.equal(request.jid)
                subscription.attrs.subscription
                    .should.equal(request.subscription)

                done()
            })
            socket.send('xmpp.pubsub.subscription', request, function() {})
        })

        it('Handles an error stanza response', function(done) {
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('iq-error'))
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.should.eql({
                    type: 'cancel',
                    condition: 'error-condition',
                    application: {
                        condition: 'unknown-error',
                        xmlns: 'http://jabber.org/protocol/pubsub#errors'
                    }
                })
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                jid: 'juliet@shakespeare.lit',
                subscription: 'subscribed'
            }
            socket.send(
                'xmpp.pubsub.subscription',
                request,
                callback
            )
        })

        it('Handles basic success response', function(done) {
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('subscribe-basic'))
            })
            var callback = function(error, success) {
                should.not.exist(error)
                success.should.be.true
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                jid: 'juliet@shakespeare.lit',
                subscription: 'subscribed'
            }
            socket.send(
                'xmpp.pubsub.subscription',
                request,
                callback
            )
        })

    })

})