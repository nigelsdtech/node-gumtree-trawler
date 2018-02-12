'use strict'

var
  cfg            = require('config'),
  chai           = require('chai'),
  fs             = require('fs'),
  jsonFile       = require('jsonfile'),
  nock           = require('nock'),
  Q              = require('q'),
  rewire         = require('rewire'),
  sinon          = require('sinon'),
  gumtreeTrawler = rewire('../../lib/gumtreeTrawl.js')

/*
 * Set up chai
 */
chai.should();



var timeout = (1000*60)


/*
 * Some stubs
 */


/*
 * Stubbed Gumtree service
 */
function stubGumtreeSearch (params) {

  if (!params) params = {}
  if (!params.response) params.response = {}
  if (!params.response.statusCode) params.response.statusCode = 200
  if (!params.response.body) params.response.body = fs.readFileSync("./test/data/gumtree_results_1.html")

  var ret = nock("https://www.gumtree.com").get(/.*/)

  if (params.replyWithError) return ret.replyWithError(params.replyWithError)

  return ret.reply(params.response.statusCode, params.response.body)
}





/*
 * Some utility functions
 */




/**
 * cleanup
 * @desc Clean up various things after running a test suite (e.g. store file, email, etc)
 *
 * @param {object}  params
 * @param {boolean} params.ipStoreFile - clean up the ipStoreFile
 */
function cleanup (params,cb) {

  var jobs = []

  if (!params) { params = {} }

  // Clean up the store file
  if (!params.hasOwnProperty('storeFile') || params.storeFile) { jobs.push(Q.nfcall(fs.unlink, cfg.resultsStoreFile)) }

  Q.all(jobs)
  .catch( function (err) {
    if (!err.code == "ENOENT") console.log(err);
  })
  .done(function () { cb() })

}

/**
 * createStoreFile
 * @desc Create a generic stub store file
 *
 * @param {object}  params (currently unused)
 */
function createStoreFile (params,cb) {

  var oldStoreFileContents = [
    {"price":"20.00",
    "title":"Microwave - Morphy Richards, Category E",
    "location":"Guildford, Surrey",
    "url":"https://www.gumtree.com/p/microwave-ovens/microwave-morphy-richards-category-e/1276063061"},
    {"price":"20.00",
    "title":"Sharp Microwave/Combination Oven &amp; Grill",
    "location":"8 miles |\nAddlestone, Surrey",
    "url":"https://www.gumtree.com/p/microwave-ovens/sharp-microwave-combination-oven-grill/1274737522"}
  ]

  if (params.oldStoreFileData) {
    oldStoreFileContents = jsonFile.readFileSync(params.oldStoreFileData)
  }

  // Create a store file with the stub IP
  jsonFile.writeFile(cfg.resultsStoreFile, oldStoreFileContents, function(err) {
    if (err) throw new Error ('createStoreFile error: ' + err)
    cb()
  });

}


/*
 * The tests
 */

var testCases = [
  { describe: "Finding new search results",
  it: "records the new results",
  gumtreeResultFile: "./test/data/gumtree_results_1.html",
  checkStoreFileContentsAtEnd: true,
  expectedFinalStoreFile: "./test/data/gumtree_results_1.json"},

  { describe: "Finding no new search results",
  it: "doesn't change the store file",
  gumtreeResultFile: "./test/data/gumtree_results_1.html",
  oldStoreFileExists: [true],
  oldStoreFileData: "./test/data/gumtree_results_1.json",
  checkStoreFileContentsAtEnd: true,
  expectedFinalStoreFile: "./test/data/gumtree_results_1.json",
  completionNoticeExpected: false},


]

/*

  { describe: "Running the script when the search service returns a bad response",
  it: "does not update the last_ip file",
  extIpServiceStub: {
    response: {
      body: "Service Unavailable",
      statusCode: 500 }},
  completionNoticeExpected: false,
  errorNoticeExpected: true,
  oldIPStoreOverrides: {
    doesntExist : {
      checkStoreFileContentsAtEnd: false,
      storeFileExistsAtEnd: false }}},

  { describe: "Running the script when the search service request fails",
  it: "does not update the last_ip file",
  extIpServiceStub: {
    replyWithError: "simulated failure" },
  oldIPStoreContents: {external:"1.2.3.4",        internal: "5.6.7.8"},
  newIPStoreContents: {external:"1.2.3.4",        internal: "5.6.7.8"},
  completionNoticeExpected: false,
  errorNoticeExpected: true,
  oldIPStoreOverrides: {
    doesntExist : {
      checkStoreFileContentsAtEnd: false,
      storeFileExistsAtEnd: false }}},
*/



testCases.forEach( (el) => {

  /*
   * Figure out if we only wanted to run this particular suite
   */

  var describeFunc = describe
  if (el.only) {describeFunc = describe.only}

  describeFunc(el.describe, function () {

    var oldStoreFileExists = el.oldStoreFileExists || [ true, false ]


    /*
     * Deviate based on whether the store file existed when the script started
     */
    oldStoreFileExists.forEach( (storeFileExistsAtStart) => {


      /*
       * Set up tests specific to this case
       */

      // were we expecting a completion notice?
      var completionNoticeExpected    = (el.hasOwnProperty('completionNoticeExpected'))?    el.completionNoticeExpected    : true
      // were we expecting an error notice?
      var errorNoticeExpected         = (el.hasOwnProperty('errorNoticeExpected'))?         el.errorNoticeExpected         : false
      // were we expecting the store file to exist at the end?
      var storeFileExistsAtEnd        = (el.hasOwnProperty('storeFileExistsAtEnd'))?        el.storeFileExistsAtEnd        : true

      var checkStoreFileContentsAtEnd = false
      if (storeFileExistsAtEnd) (
        // Do we want to check the contents of the store file at the end?
        checkStoreFileContentsAtEnd   = (el.hasOwnProperty('checkStoreFileContentsAtEnd'))? el.checkStoreFileContentsAtEnd : checkStoreFileContentsAtEnd
      )



      var oldIPStoreOverrides       = (el.hasOwnProperty('oldIPStoreOverrides'))?       el.oldIPStoreOverrides       : { exists:{}, doesntExist: {} }

      oldIPStoreOverrides.exists      = (oldIPStoreOverrides.hasOwnProperty('exists'))?       oldIPStoreOverrides.exists      : {}
      oldIPStoreOverrides.doesntExist = (oldIPStoreOverrides.hasOwnProperty('doesntExist'))?  oldIPStoreOverrides.doesntExist : {}



      // Customizations based on whether the store file exists on startup
      var description = "store file "
      if (storeFileExistsAtStart) {
        completionNoticeExpected     = (oldIPStoreOverrides.exists.hasOwnProperty('completionNoticeExpected'))?         oldIPStoreOverrides.exists.completionNoticeExpected         : completionNoticeExpected
        errorNoticeExpected          = (oldIPStoreOverrides.exists.hasOwnProperty('errorNoticeExpected'))?              oldIPStoreOverrides.exists.errorNoticeExpected              : errorNoticeExpected
        checkStoreFileContentsAtEnd  = (oldIPStoreOverrides.exists.hasOwnProperty('checkStoreFileContentsAtEnd'))?      oldIPStoreOverrides.exists.checkStoreFileContentsAtEnd      : checkStoreFileContentsAtEnd
        description += "exists"
      } else {
        completionNoticeExpected     = (oldIPStoreOverrides.doesntExist.hasOwnProperty('completionNoticeExpected'))?    oldIPStoreOverrides.doesntExist.completionNoticeExpected    : completionNoticeExpected
        errorNoticeExpected          = (oldIPStoreOverrides.doesntExist.hasOwnProperty('errorNoticeExpected'))?         oldIPStoreOverrides.doesntExist.errorNoticeExpected         : errorNoticeExpected
        checkStoreFileContentsAtEnd  = (oldIPStoreOverrides.doesntExist.hasOwnProperty('checkStoreFileContentsAtEnd'))? oldIPStoreOverrides.doesntExist.checkStoreFileContentsAtEnd : checkStoreFileContentsAtEnd
        storeFileExistsAtEnd         = (oldIPStoreOverrides.doesntExist.hasOwnProperty('storeFileExistsAtEnd'))?        oldIPStoreOverrides.doesntExist.storeFileExistsAtEnd        : storeFileExistsAtEnd
        description += "doesn't exist"
      }

      description += " at startup"


      /*
       * Here's the sub test based on whether the store file existing at the start
       */
      describe(description, function () {

        this.timeout(timeout)


        var completionNoticeSpy = null
        var errorNoticeSpy      = null
        var restore             = null

        before( function(done) {

          completionNoticeSpy = sinon.spy();
          errorNoticeSpy      = sinon.spy();

          var gumtreeSearchStub = stubGumtreeSearch( (el.hasOwnProperty('gumTreeSearchStub'))? el.gumtreeSearchStub : null)

          restore = gumtreeTrawler.__set__('reporter', {
            configure: function () {},
            handleError: errorNoticeSpy,
            sendCompletionNotice: completionNoticeSpy
          })


          if (storeFileExistsAtStart) {
            createStoreFile({oldStoreFileData: el.oldStoreFileData }, () => {gumtreeTrawler(done)})
          } else {
            gumtreeTrawler(done)
          }
        })


        /*
	 * Test for the final value of the ip store file
	 */

        if (checkStoreFileContentsAtEnd) {
          it(el.it, function(done) {
            jsonFile.readFile(cfg.resultsStoreFile, function(err, actualStoreFileContents) {
              if (err) throw new Error ('Error loading store file: ' + err)

              jsonFile.readFile(el.expectedFinalStoreFile, function(err, expectedStoreFileContents) {

                actualStoreFileContents.should.deep.equal(expectedStoreFileContents)
                done()
              })
            })
          })
        }


        /*
	 * Test the existence of the IP store on completion
	 */

        if (!storeFileExistsAtEnd) {
          it("store file doesn't exist on completion", function(done) {
            jsonFile.readFile(cfg.ipStoreFile, function(err, storeFileIPs) {
              err.code.should.equal('ENOENT')
              done()
            })
          })
        }

        /*
         * Test for a completion notice
         */

        var completionNoticeIt        = "doesn't send a completion notice"
        var completionNoticeCallCount = 0
        if (completionNoticeExpected) {
          completionNoticeIt        = "sends a completion notice with the new results"
          completionNoticeCallCount = 1
        }

        it(completionNoticeIt, function () {
          completionNoticeSpy.callCount.should.equal(completionNoticeCallCount)
	})

        /*
         * Test for an error message
         */

        var errorNoticeIt        = "doesn't send an error notice"
        var errorNoticeCallCount = 0
        if (errorNoticeExpected) {
          errorNoticeIt        = "sends an error notice"
          errorNoticeCallCount = 1
        }

        it(errorNoticeIt, function () {
          errorNoticeSpy.callCount.should.equal(errorNoticeCallCount)
	})

        after( function (done) {
          restore()
          cleanup(null,done)
        })
      })
    })
  })



})
