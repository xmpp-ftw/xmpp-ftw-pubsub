var should  = require('should')
  , PubSub  = require('../../lib/pubsub')
  , ltx     = require('ltx')
  , helper  = require('../helper')

var RSM_NS = require('xmpp-ftw/lib/utils/xep-0059').NS

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
 
    describe('Get affiliations', function() {

        it('Errors when no callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing callback")
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.pubsub.affiliations', {})
        })

        it('Errors when non-function callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing callback")
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.pubsub.affiliations', {}, true)
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
                error.description.should.equal("Missing 'to' key")
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit('xmpp.pubsub.affiliations', request, callback)
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
                error.description.should.equal("Can only do 'owner' for a node")
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit('xmpp.pubsub.affiliations', request, callback)        
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
                pubsubElement.getChild('affiliations').should.exist
                pubsubElement.getChild('affiliations').attrs.node
                    .should.equal(request.node)
                done()
            })
            socket.emit('xmpp.pubsub.affiliations', request, function() {})
        })

        it('Sends expected stanza for user affiliations', function(done) {
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
                pubsubElement.getChild('affiliations').should.exist
                should.not.exist(
                    pubsubElement.getChild('affiliations').attrs.node
                )
                done()
            })
            socket.emit('xmpp.pubsub.affiliations', request, function() {})
        })

        it('Correct stanza for user affiliations to node', function(done) {
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
                pubsubElement.getChild('affiliations').should.exist
                pubsubElement.getChild('affiliations').attrs.node
                    .should.equal(request.node)
                done()
            })
            socket.emit('xmpp.pubsub.affiliations', request, function() {})
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
            socket.emit('xmpp.pubsub.affiliations', request, function() {})
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
                node: 'twelfth night'
            }
            socket.emit(
                'xmpp.pubsub.affiliations',
                request,
                callback
            )
        })

        it('Sends a list of affiliations', function(done) {
            xmpp.once('stanza', function(stanza) {
                manager.makeCallback(helper.getStanza('affiliations'))
            })
            var callback = function(error, data) {
                should.not.exist(error)
                data.length.should.equal(2)
                data[0].node.should.equal('twelfth night')
                data[0].affiliation.should.equal('owner')
                data[1].node.should.equal('a comedy of errors')
                data[1].affiliation.should.equal('publisher')
                // Injected to show response can handle JID
                data[1].jid.should.eql({
                    domain: 'example.com',
                    user: 'romeo'
                })
                done()
            }
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night'
            }
            socket.emit(
                'xmpp.pubsub.affiliations',
                request,
                callback
            )
        })
        
        it('Adds RSM to results', function(done) {
            xmpp.once('stanza', function(stanza) {
                manager.makeCallback(helper.getStanza('affiliations-with-rsm'))
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
            socket.emit(
                'xmpp.pubsub.affiliations',
                request,
                callback
            )
        })

    })

    describe('Set affiliation', function() {

        it('Errors when no callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing callback")
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.pubsub.affiliation', {})
        })

        it('Errors when non-function callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing callback")
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.pubsub.affiliation', {}, true)
        })

        it('Errors when missing \'to\' key', function(done) {
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
                'xmpp.pubsub.affiliation',
                request,
                callback
            )
        })

        it('Errors when missing \'node\' key', function(done) {
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
                'xmpp.pubsub.affiliation',
                request,
                callback
            )
        })

        it('Errors when missing \'jid\' key', function(done) {
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
                error.description.should.equal("Missing 'jid' key")
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.pubsub.affiliation',
                request,
                callback
            )
        })

        it('Errors when missing \'affiliation\' key', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                jid: 'romeo@example.com'
            }
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing 'affiliation' key")
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit(
                'xmpp.pubsub.affiliation',
                request,
                callback
            )
        })

        it('Sends expected stanza', function(done) {
            var request = {
                to: 'pubsub.shakespeare.lit',
                node: 'twelfth night',
                jid: 'romeo@example.com',
                affiliation: 'moderator'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.id.should.exist
                stanza.attrs.to.should.equal(request.to)
                var element = stanza
                    .getChild('pubsub', pubsub.NS_OWNER)
                    .getChild('affiliations')
                element.should.exist
                element.attrs.node.should.equal(request.node)
                element.children.length.should.equal(1)
                element.children[0].attrs.jid.should.equal(request.jid)
                element.children[0].attrs.affiliation
                    .should.equal(request.affiliation)
                done()
            })
            socket.emit(
                'xmpp.pubsub.affiliation',
                request,
                function() {}
            )
        })

        it('Handles error stanza', function(done) {
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
                jid: 'romeo@example.com',
                affiliation: 'publisher'
            }
            socket.emit(
                'xmpp.pubsub.affiliation',
                request,
                callback
            )
        })

        it('Sends true with successful request', function(done) {
            xmpp.once('stanza', function(stanza) {
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
                jid: 'romeo@example.com',
                affiliation: 'publisher'
            }
            socket.emit(
                'xmpp.pubsub.affiliation',
                request,
                callback
            )
        })
    })

})
