/*
 * Main program
 *
 * Search Gumtree for new results of a particular search and send an email with any new results
 */

var
  cfg            = require('config'),
  cheerio        = require('cheerio'),
  jsonFile       = require('jsonfile'),
  log4js         = require('log4js'),
  Q              = require('q'),
  reporter       = require('reporter'),
  request        = require('request');



module.exports = function (programComplete) {

  /*
   * Initialize
   */


  /*
   * Logs
   */
  log4js.configure(cfg.log.log4jsConfigs);

  var log = log4js.getLogger(cfg.log.appName);
  log.setLevel(cfg.log.level);


  /*
   * Job reporter
   */
  reporter.configure(cfg.reporter);


  /**
   * getGumtreeResults
   * @desc gets the external IP address of the device
   *
   * @param {object}   params (currently unused)
   * @param {function} cb - a callback of one of the following forms:
   *                        cb(err)
   *                        cb(null, {object[]} gumtreeResults)
   *
   */
  function getGumtreeResults (params, cb) {

    request({
      method: "GET",
      uri: cfg.gumtreeSearch
    }, function (err, resp, body) {

      if (err || resp.statusCode != 200) {
        cb("getGumtreeResults - Error contacting Gumtree: " + err)
        return
      }

      var $ = cheerio.load(body)
      var listings = $("a.listing-link")

      var maxResults = cfg.has('maxResults')? cfg.maxResults : 10
      var j = 0

      var results = []

      listings.each(function (i, listing) {
        if (j < maxResults) {

          var result = {}  

          var listingContent = $(listing).children(".listing-content")

          result.price    = listingContent.children(".listing-price").children("meta[itemprop='price']").attr("content")

          // Filter out adverts
          if (!result.price || result.price == "") return;


          result.title    = listingContent.children(".listing-title").text().trim()
          result.location = listingContent.children(".listing-location").text().trim().replace("Distance from search location: ", "") 
          result.url      = "https://www.gumtree.com" + $(listing).attr("href").trim()

          results.push(result)
          j++
        }
      })


      cb(null, results)
    })

  }


  /**
   * getOldResults
   * @desc Loads previously stored results
   *
   * @param {object}   params (currently unused)
   * @param {function} cb - a callback of one of the following forms:
   *                        cb(err)
   *                        cb(null, {object[]})
   *
   */
  function getOldResults (params, cb) {

    var file = cfg.resultsStoreFile

    log.debug('getOldResults: Getting file ' + file)

    jsonFile.readFile(file, function(err, oldResults) {

      if (err) {

        if (err.code == "ENOENT") {
          // The file doesn't exist. Just set dummy values for now
          log.info('Old Result file doesn\'t exist')
          oldResults = []

        } else {
          cb('Error loading old Results: ' + err)
          return
        }
      }

      log.debug('getOldResults: Old Results: ' + JSON.stringify(oldResults))
      cb(null,oldResults)
    })

  }


  /*
   * Compares two arrays and gets the diffs. Gumtree items are considered unique
   * based on their URL.
   */
  function comparer(otherArray){
    return function(current){
      return otherArray.filter(function(other){
        return other.url == current.url
      }).length == 0;
    }
  }

  /*
   *
   * Main program
   *
   */


  log.info('Begin script');
  log.info('============');


  Q.all([
    Q.nfcall(getGumtreeResults, null),
    Q.nfcall(getOldResults, null)
  ])
  .spread (function (newResults, oldResults) {

    log.info ('Old results:')
    log.info ('%s', JSON.stringify(oldResults,null,null))

    log.info ('New results:')
    log.info ('%s', JSON.stringify(newResults,null,null))

    var changes = false

    var diffs = newResults.filter(comparer(oldResults))

    if (diffs.length > 0) {
      changes = true
      log.info ('New listings found:')
      log.info (JSON.stringify(diffs))
    }

    if (changes) {

      // Store to the file
      log.info('Writing to file...')
      jsonFile.writeFile(cfg.resultsStoreFile, newResults , function (err) {
        if (err) {
          throw new Error ("Error saving results: " + err)
        }
        log.info('Written to file')
      })


      var emailBody = "New results - "
      for (var i = 0; i < diffs.length; i++ ) {

        var result = diffs[i]
        emailBody +=  "<p>"
        emailBody +=  "<br>" + result.title
        emailBody +=  "<br>" + result.location
        emailBody +=  "<br>" + result.url
        emailBody +=  "<br>£" + result.price
      }

      // Send it out to the listener
      log.info('Sending completion notice')
      reporter.sendCompletionNotice({
        body: emailBody
      })

    } else {
      log.info ('No change in results')
    }

  })
  .catch (function (errMsg) {
    log.error(errMsg)
    reporter.handleError({errMsg: errMsg})
  })
  .done(function () {
    if (programComplete) programComplete();
  });

}
