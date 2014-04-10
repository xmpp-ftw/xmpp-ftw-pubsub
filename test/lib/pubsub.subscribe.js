'use strict';

/* jshint -W030 */

var should  = require('should')
  , PubSub  = require('../../index')
  , helper  = require('../helper')

var RSM_NS = require('xmpp-ftw').utils['xep-0059'].NS

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
            jid: 'juliet@example.net',
            getJidType: function(type) {
                if ('bare' === type) {
                    return 'juliet@example.net'
                }
                throw new Error('Unexpected jid type requested')
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

    describe('Subscribe', function() {

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
            socket.send('xmpp.pubsub.subscribe', {})
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
            socket.send('xmpp.pubsub.subscribe', {}, true)
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
            socket.send('xmpp.pubsub.subscribe', request, callback)
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
            socket.send('xmpp.pubsub.subscribe', request, callback)
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
                pubsubElement.getChild('subscribe').should.exist
                pubsubElement.getChild('subscribe').attrs.node
                    .should.equal(request.node)
                pubsubElement.getChild('subscribe').attrs.jid
                    .should.equal(manager.jid)
                done()
            })
            socket.send('xmpp.pubsub.subscribe', request, function() {})
        })

        it('Sends expected stanza with jid', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                jid: manager.jid + '/resource'
            }
            xmpp.once('stanza', function(stanza) {
                var pubsubElement = stanza.getChild('pubsub')
                pubsubElement.getChild('subscribe').attrs.jid
                    .should.equal(request.jid)
                done()
            })
            socket.send('xmpp.pubsub.subscribe', request, function() {})
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
                'xmpp.pubsub.subscribe',
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
                success.subscription.should.equal('subscribed')
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            socket.send(
                'xmpp.pubsub.subscribe',
                request,
                callback
            )
        })

        it('Handles success response with subscription id', function(done) {
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('subscribe-subid'))
            })
            var callback = function(error, success) {
                should.not.exist(error)
                success.id.should.equal('123456')
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            socket.send(
                'xmpp.pubsub.subscribe',
                request,
                callback
            )
        })

        it('Handles configuration required', function(done) {
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('subscribe-options'))
            })
            var callback = function(error, success) {
                should.not.exist(error)
                success.configuration.required.should.be.true
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            socket.send(
                'xmpp.pubsub.subscribe',
                request,
                callback
            )
        })

    })

    describe('Unsubscribe', function() {

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
            socket.send('xmpp.pubsub.unsubscribe', {})
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
            socket.send('xmpp.pubsub.unsubscribe', {}, true)
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
            socket.send('xmpp.pubsub.unsubscribe', request, callback)
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
            socket.send('xmpp.pubsub.unsubscribe', request, callback)
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
                pubsubElement.getChild('unsubscribe').should.exist
                pubsubElement.getChild('unsubscribe').attrs.node
                    .should.equal(request.node)
                done()
            })
            socket.send('xmpp.pubsub.unsubscribe', request, function() {})
        })

        it('Sends expected stanza when \'subscription id\'', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                id: '123456'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.getChild('pubsub')
                    .getChild('unsubscribe')
                    .attrs.subid.should.equal('123456')
                done()
            })
            socket.send('xmpp.pubsub.unsubscribe', request, function() {})
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
                'xmpp.pubsub.unsubscribe',
                request,
                callback
            )
        })

        it('Handles success response', function(done) {
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
                'xmpp.pubsub.unsubscribe',
                request,
                callback
            )
        })

    })

    describe('Get node subscriptions', function() {

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
            socket.send('xmpp.pubsub.subscriptions', {})
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
            socket.send('xmpp.pubsub.subscriptions', {}, true)
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
            socket.send('xmpp.pubsub.subscriptions', request, callback)
        })

        it('Errors if node subs requested and no owner', function(done) {
            var request = { to: 'pubsub.shakespeare.lit', owner: true }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Can only do \'owner\' for a node')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.send('xmpp.pubsub.subscriptions', request, callback)
        })

        it('Sends expected stanza for node owner', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                owner: true
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('get')
                stanza.attrs.id.should.exist
                stanza.getChild('pubsub', pubsub.NS_OWNER).should.exist
                var pubsubElement = stanza.getChild('pubsub')
                pubsubElement.getChild('subscriptions').should.exist
                pubsubElement.getChild('subscriptions').attrs.node
                    .should.equal(request.node)
                done()
            })
            socket.send('xmpp.pubsub.subscriptions', request, function() {})
        })

        it('Sends expected stanza for user subscriptions', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('get')
                stanza.attrs.id.should.exist
                stanza.getChild('pubsub', pubsub.NS_PUBSUB).should.exist
                var pubsubElement = stanza.getChild('pubsub')
                pubsubElement.getChild('subscriptions').should.exist
                should.not.exist(
                    pubsubElement.getChild('subscriptions').attrs.node
                )
                done()
            })
            socket.send('xmpp.pubsub.subscriptions', request, function() {})
        })

        it('Correct stanza for user subscriptions to node', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('get')
                stanza.attrs.id.should.exist
                stanza.getChild('pubsub', pubsub.NS_PUBSUB).should.exist
                var pubsubElement = stanza.getChild('pubsub')
                pubsubElement.getChild('subscriptions').should.exist
                pubsubElement.getChild('subscriptions').attrs.node
                    .should.equal(request.node)
                done()
            })
            socket.send('xmpp.pubsub.subscriptions', request, function() {})
        })

        it('Handles error stanza response', function(done) {
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
                'xmpp.pubsub.subscriptions',
                request,
                callback
            )

        })

        it('Sends a list of subscriptions', function(done) {
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('subscriptions'))
            })
            var callback = function(error, data) {
                should.not.exist(error)
                data.length.should.equal(2)
                data[0].node.should.equal('twelfth night')
                data[0].jid.should.eql({
                    domain: 'example.net',
                    user: 'juliet'
                })
                data[0].subscription.should.equal('subscribed')
                should.not.exist(data[0].id)
                data[1].node.should.equal('a comedy of errors')
                data[1].jid.should.eql({
                    domain: 'example.com',
                    user: 'romeo'
                })
                data[1].subscription.should.equal('subscribed')
                data[1].id.should.equal('1')
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            socket.send(
                'xmpp.pubsub.subscriptions',
                request,
                callback
            )
        })

        it('Adds RSM to outgoing stanza', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                rsm: {
                    max: '20',
                    before: 'item-123'
                }
            }
            xmpp.once('stanza', function(stanza) {
                var rsm = stanza.getChild('pubsub').getChild('set', RSM_NS)
                rsm.getChildText('max').should.equal(request.rsm.max)
                rsm.getChildText('before').should.equal(request.rsm.before)
                done()
            })
            socket.send('xmpp.pubsub.subscriptions', request, function() {})
        })

        it('Adds RSM to results', function(done) {
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('subscriptions-with-rsm'))
            })
            var callback = function(error, data, rsm) {
                should.not.exist(error)
                should.exist(data)
                rsm.should.eql({
                    count: 20,
                    first: 'item-1',
                    last: 'item-10'
                })
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            socket.send(
                'xmpp.pubsub.subscriptions',
                request,
                callback
            )
        })

    })

    describe('Subscription configuration', function() {

        describe('Default configuration', function() {

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
                socket.send('xmpp.pubsub.subscription.config.default', {})
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
                socket.send('xmpp.pubsub.subscription.config.default', {}, true)
            })

            it('Errors when no \'to\' key provided', function(done) {
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
                    'xmpp.pubsub.subscription.config.default',
                    request,
                    callback
                )
            })

            it('Sends expected stanza', function(done) {
                var request = { to: 'pubsub.shakespeare.lit' }
                xmpp.once('stanza', function(stanza) {
                    stanza.is('iq').should.equal.true
                    stanza.attrs.type.should.equal('get')
                    stanza.attrs.to.should.equal(request.to)
                    stanza.attrs.id.should.exist
                    stanza.getChild('pubsub', pubsub.NS_PUBSUB).should.exist
                    var element = stanza.getChild('pubsub').getChild('default')
                    element.should.exist
                    should.not.exist(element.attrs.node)
                    done()
                })
                socket.send(
                    'xmpp.pubsub.subscription.config.default',
                    request,
                    function() {}
                )
            })

            it('Sends expected stanza with node', function(done) {
                var request = {
                    to: 'pubsub.shakespeare.lit',
                    node: 'twelfth night'
                }
                xmpp.once('stanza', function(stanza) {
                    stanza.is('iq').should.equal.true
                    stanza.attrs.type.should.equal('get')
                    stanza.attrs.to.should.equal(request.to)
                    stanza.attrs.id.should.exist
                    stanza.getChild('pubsub', pubsub.NS_PUBSUB).should.exist
                    var element = stanza.getChild('pubsub').getChild('default')
                    element.should.exist
                    element.attrs.node.should.equal(request.node)
                    done()
                })
                socket.send(
                    'xmpp.pubsub.subscription.config.default',
                    request,
                    function() {}
                )
            })

            it('Handles error response', function(done) {
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
                    'xmpp.pubsub.subscription.config.default',
                    request,
                    callback
                )
            })

            it('Returns data from successful request', function(done) {
                xmpp.once('stanza', function() {
                    manager.makeCallback(
                        helper.getStanza('subscription-options-default')
                    )
                })
                var callback = function(error, data) {
                    should.not.exist(error)
                    data.fields.length.should.equal(2)
                    data.fields[0].var.should.equal('pubsub#notifications')
                    data.fields[0].value.should.equal('1')
                    data.fields[1].var.should.equal('pubsub#include_body')
                    data.fields[1].value.should.equal('0')
                    done()
                }
                var request = {
                    to: 'pubsub.shakespeare.lit',
                    node: 'twelfth night'
                }
                socket.send(
                    'xmpp.pubsub.subscription.config.default',
                    request,
                    callback
                )
            })

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
                socket.send('xmpp.pubsub.subscription.config.get', {})
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
                socket.send('xmpp.pubsub.subscription.config.get', {}, true)
            })

            it('Errors when no \'to\' key provided', function(done) {
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
                    'xmpp.pubsub.subscription.config.get',
                    request,
                    callback
                )
            })

            it('Errors when no \'node\' key provided', function(done) {
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
                    'xmpp.pubsub.subscription.config.get',
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
                    stanza.is('iq').should.equal.true
                    stanza.attrs.type.should.equal('get')
                    stanza.attrs.to.should.equal(request.to)
                    stanza.attrs.id.should.exist
                    stanza.getChild('pubsub', pubsub.NS_PUBSUB).should.exist
                    var element = stanza.getChild('pubsub').getChild('options')
                    element.should.exist
                    element.attrs.node.should.equal(request.node)
                    done()
                })
                socket.send(
                    'xmpp.pubsub.subscription.config.get',
                    request,
                    function() {}
                )
            })

            it('Handles error response', function(done) {
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
                    'xmpp.pubsub.subscription.config.get',
                    request,
                    callback
                )
            })

            it('Returns data from successful request', function(done) {
                xmpp.once('stanza', function() {
                    manager.makeCallback(
                        helper.getStanza('subscription-options')
                    )
                })
                var callback = function(error, data) {
                    should.not.exist(error)
                    data.fields.length.should.equal(2)
                    data.fields[0].var.should.equal('pubsub#notifications')
                    data.fields[0].value.should.equal('1')
                    data.fields[1].var.should.equal('pubsub#include_body')
                    data.fields[1].value.should.equal('0')
                    done()
                }
                var request = {
                    to: 'pubsub.shakespeare.lit',
                    node: 'twelfth night'
                }
                socket.send(
                    'xmpp.pubsub.subscription.config.get',
                    request,
                    callback
                )

            })

        })

        describe('Set configuration', function() {

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
                socket.send('xmpp.pubsub.subscription.config.set', {})
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
                socket.send('xmpp.pubsub.subscription.config.set', {}, true)
            })

            it('Errors when no \'to\' key provided', function(done) {
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
                    'xmpp.pubsub.subscription.config.set',
                    request,
                    callback
                )
            })

            it('Errors when no \'node\' key provided', function(done) {
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
                    'xmpp.pubsub.subscription.config.set',
                    request,
                    callback
                )
            })

            it('Errors when no data form provided', function(done) {
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
                socket.send(
                    'xmpp.pubsub.subscription.config.set',
                    request,
                    callback
                )
            })

            it('Errors with unparsable data form', function(done) {
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
                socket.send(
                    'xmpp.pubsub.subscription.config.set',
                    request,
                    callback
                )
            })

            it('Sends expected stanza', function(done) {
                xmpp.once('stanza', function(stanza) {
                    stanza.is('iq').should.be.true
                    stanza.attrs.type.should.equal('set')
                    stanza.attrs.to.should.equal(request.to)
                    stanza.attrs.id.should.exist
                    var options = stanza.getChild('pubsub', pubsub.NS_PUBSUB)
                        .getChild('options')
                    options.attrs.node.should.equal(request.node)
                    options.attrs.jid.should.equal(request.jid)
                    var dataForm = options.getChild('x', 'jabber:x:data')
                    dataForm.should.exist
                    dataForm.attrs.type.should.equal('form')
                    dataForm.children.length.should.equal(3)
                    var fields = dataForm.children
                    fields[0].attrs.var.should.equal('FORM_TYPE')
                    fields[0].attrs.type.should.equal('hidden')
                    fields[0].getChildText('value')
                        .should.equal(pubsub.NS_SUB_OPTIONS)
                    fields[1].attrs.var.should.equal('pubsub#notifications')
                    fields[1].getChildText('value').should.equal('true')
                    fields[2].attrs.var.should.equal('pubsub#include_body')
                    fields[2].getChildText('value').should.equal('false')
                    done()
                })
                var request = {
                    to: 'pubsub.shakespeare.lit',
                    node: 'twelfth night',
                    form: [
                        { var: 'pubsub#notifications', value: true },
                        { var: 'pubsub#include_body', value: false }
                    ],
                    jid: 'romeo@example.com'
                }
                socket.send(
                    'xmpp.pubsub.subscription.config.set',
                    request,
                    function() {}
                )
            })

            it('Fills JID if not provided', function(done) {
                xmpp.once('stanza', function(stanza) {
                    stanza.getChild('pubsub', pubsub.NS_PUBSUB)
                        .getChild('options')
                        .attrs.jid.should.equal(manager.jid)
                    done()
                })
                var request = {
                    to: 'pubsub.shakespeare.lit',
                    node: 'twelfth night',
                    form: [
                        { var: 'pubsub#notifications', value: true },
                        { var: 'pubsub#include_body', value: false }
                    ]
                }
                socket.send(
                    'xmpp.pubsub.subscription.config.set',
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
                    node: 'twelfth night',
                    form: []
                }
                socket.send(
                    'xmpp.pubsub.subscription.config.set',
                    request,
                    callback
                )
            })

            it('Returns true for succesful set', function(done) {
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
                socket.send(
                    'xmpp.pubsub.subscription.config.set',
                    request,
                    callback
                )
            })

        })

    })

})
