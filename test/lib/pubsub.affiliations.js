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
 
    describe('Get affiliations', function() {

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
            socket.emit('xmpp.pubsub.affiliations', request)
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
            socket.emit('xmpp.pubsub.affiliations', request)
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
            socket.emit('xmpp.pubsub.affiliations', request)
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
})
