'use strict';

/* jshint -W030 */

var should  = require('should')
  , PubSub  = require('../../index')
  , helper  = require('../helper')

var RSM_NS = require('xmpp-ftw').utils['xep-0059'].NS

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
            },
            _getLogger: function() {
                return {
                    log: function() {},
                    error: function() {},
                    warn: function() {},
                    info: function() {}
                }
            }
        }
        pubsub = new PubSub()
        pubsub.init(manager)
    })

    describe('Publishing items', function() {

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
            socket.emit('xmpp.pubsub.publish', {})
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
            socket.emit('xmpp.pubsub.publish', {}, true)
        })

        it('Errors if \'to\' key missing', function(done) {
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
                error.description.should.equal('Missing \'node\' key')
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

        it('Errors if no \'content\' key', function(done) {
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
                error.description.should.equal('Missing message content')
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
                error.description.should.equal('Missing message content')
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
                    .should.equal('Could not parse content to stanza')
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
                    .should.equal('Badly formatted data form')
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
                content: 'hello world'
            }
            socket.emit(
                'xmpp.pubsub.publish',
                request,
                callback
            )
        })

        it('Returns post ID on success', function(done) {
            xmpp.once('stanza', function() {
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
            socket.emit('xmpp.pubsub.unsubscribe', {})
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
            socket.emit('xmpp.pubsub.unsubscribe', {}, true)
        })

        it('Errors when no \'to\' key', function(done) {
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
            socket.emit('xmpp.pubsub.unsubscribe', request, callback)
        })

        it('Errors when no \'node\' key', function(done) {
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
            socket.emit('xmpp.pubsub.retrieve', request, callback)
        })

        it('Errors if \'id\' key not string or array[string]', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                id: true
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal(
                    'ID should be string or array of strings'
                )
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit('xmpp.pubsub.retrieve', request, callback)
        })

        it('Sends expected stanza', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('get')
                var items = stanza.getChild('pubsub', pubsub.NS_PUBSUB)
                    .getChild('items')
                items.should.exist
                items.attrs.node.should.equal(request.node)
                done()
            })
            socket.emit('xmpp.pubsub.retrieve', request, function() {})
        })

        it('Sends expected stanza with single ID', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                id: 1
            }
            xmpp.once('stanza', function(stanza) {
                var items = stanza.getChild('pubsub', pubsub.NS_PUBSUB)
                    .getChild('items')
                items.children.length.should.equal(1)
                items.getChild('item').attrs.id.should.equal(request.id)
                done()
            })
            socket.emit('xmpp.pubsub.retrieve', request, function() {})
        })

        it('Sends expected stanza with multiple ID', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                id: [ 1, '2', 3, 'item-4' ]
            }
            xmpp.once('stanza', function(stanza) {
                var items = stanza.getChild('pubsub', pubsub.NS_PUBSUB)
                    .getChild('items')
                items.children.length.should.equal(4)
                items.getChild('item').attrs.id.should.equal(request.id[0])
                items.children[1].attrs.id.should.equal(request.id[1])
                items.children[2].attrs.id.should.equal(request.id[2])
                items.children[3].attrs.id.should.equal(request.id[3])
                done()
            })
            socket.emit('xmpp.pubsub.retrieve', request, function() {})
        })

        it('Sends expected stanza with \'max_items\'', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                maxItems: 3
            }
            /* jshint -W106 */
            xmpp.once('stanza', function(stanza) {
                stanza.getChild('pubsub', pubsub.NS_PUBSUB)
                    .getChild('items').attrs.max_items.should.equal(request.maxItems)
                done()
            })
            socket.emit('xmpp.pubsub.retrieve', request, function() {})
        })

        it('Sends expected stanza when RSM applied', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                rsm: {
                    max: '30',
                    after: 'item-12345'
                }
            }
            xmpp.once('stanza', function(stanza) {
                var rsm = stanza.getChild('pubsub').getChild('set', RSM_NS)
                rsm.getChildText('max').should.equal(request.rsm.max)
                rsm.getChildText('after').should.equal(request.rsm.after)
                done()
            })
            socket.emit('xmpp.pubsub.retrieve', request, function() {})
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
            socket.emit(
                'xmpp.pubsub.retrieve',
                request,
                callback
            )
        })

        it('Returns items on expected response', function(done) {
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('items-get'))
            })
            var callback = function(error, success) {
                should.not.exist(error)
                success.length.should.equal(2)
                success[0].id.should.equal('item-1')
                success[0].entry.should.eql({ body: 'item-1-content' })
                success[1].id.should.equal('item-2')
                success[1].entry.should.eql({ body: 'item-2-content' })
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            socket.emit(
                'xmpp.pubsub.retrieve',
                request,
                callback
            )
        })

        it('Returns RSM argument if it is provided', function(done) {
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('items-get-rsm'))
            })
            var callback = function(error, success, rsm) {
                should.not.exist(error)
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
            socket.emit(
                'xmpp.pubsub.retrieve',
                request,
                callback
            )
        })
    })

    describe('Deleting node items', function() {

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
            socket.emit('xmpp.pubsub.item.delete', {})
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
            socket.emit('xmpp.pubsub.item.delete', {}, true)
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
            socket.emit('xmpp.pubsub.item.delete', request, callback)
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
            socket.emit('xmpp.pubsub.item.delete', request, callback)
        })

        it('Errors if missing item id', function(done) {
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
                error.description.should.equal('Missing \'id\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit('xmpp.pubsub.item.delete', request, callback)
        })

        it('Sends expected stanza', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                id: 'item-1'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.to.should.equal(request.to)
                stanza.attrs.type.should.equal('set')
                var retract = stanza.getChild('pubsub', pubsub.NS_PUBSUB)
                    .getChild('retract')
                retract.should.exist
                retract.attrs.node.should.equal(request.node)
                retract.children.length.should.equal(1)
                retract.getChild('item').attrs.id.should.equal(request.id)
                done()
            })
            socket.emit('xmpp.pubsub.item.delete', request, function() {})

        })

        it('Handles error stanza', function(done) {
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
                id: 'item-1'
            }
            socket.emit(
                'xmpp.pubsub.item.delete',
                request,
                callback
            )
        })

        it('Returns true for successful response', function(done) {
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
                id: 'item-1'
            }
            socket.emit(
                'xmpp.pubsub.item.delete',
                request,
                callback
            )
        })

    })

    describe('Purging a node', function() {

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
            socket.emit('xmpp.pubsub.purge', {})
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
            socket.emit('xmpp.pubsub.purge', {}, true)
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
            socket.emit('xmpp.pubsub.purge', request, callback)
        })

        it('Errors if missing \'node\' key', function(done) {
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
            socket.emit('xmpp.pubsub.purge', request, callback)
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
                var purge = stanza.getChild('pubsub', pubsub.NS_PUBSUB)
                    .getChild('purge')
                purge.should.exist
                purge.attrs.node.should.equal(request.node)
                done()
            })
            socket.emit('xmpp.pubsub.purge', request, function() {})
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
            socket.emit('xmpp.pubsub.purge', request, callback)
        })

        it('Returns true for successful response', function(done) {
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
            socket.emit('xmpp.pubsub.purge', request, callback)
        })

    })

})
