
/**
 * Background logic for ipt chrome extension.
 */
{
  /**
   * Global variables
   */
  var dictCc = {
    "address": ".syn.dict.cc/?s=",
    "language": "",
    "direction": "",
    "active": false,
    "icon": "icon19.png",
    "iconInactive": "icon19inactive.png",
    "languageId": "language",
    "directionId": "direction",
    "urlExt": "&ref=chrome-ext",
    "contextMenuSearch": "tooltip",
    "storageContextMenuSearch": "dict_cc_context_menu_search",
    "contextMenuSearchId": "contextmenusearch",
    "storageActive": "dict_cc_active",
    "searchInTextFieldId": "search_in_text_field",
    "storageSearchInTextField": "dict_cc_search_in_text_field",
    "searchInTextField": true,
    "storageOpenInNewTab": "dict_cc_open_in_new_tab",
    "openInNewTab": true,
    "openInNewTabId": "open_in_new_tab",
    "tooltipCenteredId": "tooltip_centered",
    "tooltipCentered": false,
    "storageTooltipCentered": "dict_cc_tooltip_centered",
    "onlyDbClick": false,
    "onlyDbClickId": "only_db_click",
    "storageOnlyDbClick": "dict_cc_only_db_click"
  };


  var contextMenu = null;

  /**
   * Stick a listener for requests from other pages and browser action.
   */
  // chrome.runtime.onMessage.addListener(onMessage);

  chrome.runtime.onMessage.addListener(onMessageTest);

  function onMessageTest(request, sender, sendResponse) {
    console.log(request);
    console.log(sender.tab ?
      "from a content script:" + sender.tab.url :
      "from the extension");
    if (request.greeting == "hello")
      sendResponse({
        farewell: "goodbye"
      });
  };


  /**
   * On startup, restore options or set defaults.
   */
  dictCc.contextMenuSearch = (localStorage[dictCc.storageContextMenuSearch] != null) ? localStorage[dictCc.storageContextMenuSearch] : dictCc.contextMenuSearch;
  dictCc.searchInTextField = (localStorage[dictCc.storageSearchInTextField] != null) ? localStorage[dictCc.storageSearchInTextField] : dictCc.searchInTextField;
  dictCc.openInNewTab = (localStorage[dictCc.storageOpenInNewTab] != null) ? localStorage[dictCc.storageOpenInNewTab] : dictCc.openInNewTab;
  dictCc.tooltipCentered = (localStorage[dictCc.storageTooltipCentered] != null) ? localStorage[dictCc.storageTooltipCentered] : dictCc.tooltipCentered;
  dictCc.onlyDbClick = (localStorage[dictCc.storageOnlyDbClick] != null) ? localStorage[dictCc.storageOnlyDbClick] : dictCc.onlyDbClick;


  /**
   * Create or remove the context menu search entry, based on the contextMenuSearch flag.
   */
  contextMenuSearch();

  /**
   * Simulate the button click, to set the correct tooltip based on the localization. The active flag must be inverted,
   * because at the end of the onBrowserActionClicked function it will be inverted again.
   */
  onBrowserActionClicked(null);

  /**
   * Performs an XMLHttpRequest to dict.cc to get the translation of the
   * user selection.
   * @param user selection
   * @param callback method on success.
   */
  function translateSelection(selection, callback) {
    // Create request and define result function.
    //
    var request = new XMLHttpRequest();
    request.onreadystatechange = function(data) {
      // If the request was done, and the status is OK -> 200, invoke the callback function.
      //
      if (request.readyState == 4 && request.status == 200) {
        callback(request.responseText);
      }
    }

    // Build the translation url for the request.
    //
    var url = "http://" + dictCc.language + dictCc.address + selection + dictCc.urlExt;
    console.log("dict-cc request url: " + url);

    // Send the request to dict.cc.
    //
    request.open("GET", url, true);
    request.send();
  }

  /**
   * Handles data sent via chrome.extension.sendRequest().
   * @param request object.
   * @param sender object that invokes the request.
   * @param callback function when the request completes.
   */
  function onMessage(request, sender, callback) {
    console.log("background hit. ")
    // If the translateSelection request was received, just call the method.
    //
    if (request.action == "translateSelection") {

      // translateSelection(request.selection, callback);
      callback("Dummy Employee")
    }


    // If the log request was received, just log the message.
    //
    if (request.action == "log") {
      console.log(request.message);
    }

    // If resize was received, calculate and return the current window size.
    //
    if (request.action == "resize") {
      chrome.windows.getCurrent(function(win) {
        callback({
          "width": win.width,
          "height": win.height
        });
      });
    }

    // If the centered request was received, just return the tooltip centered flag.
    //
    if (request.action == "centered") {
      callback(((dictCc.tooltipCentered == "true") || (dictCc.tooltipCentered == true)) ? true : false);
    }
  }


  /**
   * Returns a select element of all languages.
   */
  function getLanguageSelect() {
    var select = document.createElement("select");

    // Add german languages.
    //
    for (var key in languagesDE) {
      var opt = document.createElement("option");
      opt.innerHTML = languagesDE[key];
      opt.value = key;

      select.appendChild(opt);
    }

    // Add english languages.
    //
    for (var key in languagesEN) {
      var opt = document.createElement("option");
      opt.innerHTML = languagesEN[key];
      opt.value = key;

      select.appendChild(opt);
    }

    return select;
  }


  /**
   * Return the detected language of the selected tab of the current window.
   * @param callback for the detected language response.
   */
  function detectedLanguage(callback) {
    chrome.windows.getCurrent(function(win) {
      chrome.tabs.getSelected(win.id, function(tab) {
        chrome.tabs.detectLanguage(tab.id, function(language) {
          var l = null;

          if (dictCc.direction == "de") {
            for (var key in languagesDE) {
              if (key.substr(2, 2) == language) {
                l = {
                  "key": key,
                  "value": languagesDE[key].substr(12)
                };
                break;
              }
            }
          } else {
            for (var key in languagesEN) {
              if (key.substr(2, 2) == language) {
                l = {
                  "key": key,
                  "value": languagesEN[key].substr(12)
                };
                break;
              }
            }
          }

          // Callback the detected language.
          //
          callback(l);
        });
      });
    });
  }






  /**
   * Context menu function to translate a selected word, also available in frameset based websites.
   */
  function contextMenuTranslation(info, tab) {
    if ((!info.selectionText) || (info.selectionText.length == 0)) {
      return;
    }

    var max_len = 64;
    var search_text = (info.selectionText.length <= max_len) ? info.selectionText : info.selectionText.substr(0, maxLength);

    if (dictCc.contextMenuSearch == "tooltip" && ((dictCc.active == "true") || (dictCc.active == true))) {
      // Send message to the context script.
      chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.sendMessage(tab.id, {
          reason: "contextmenutranslation"
        }, function() {});
      });
    } else {
      // Open new tab for the translation.
      var url = "http://" + dictCc.language + ".dict.cc/?s=" + search_text;
      console.log("dict-cc context menu request url: " + url);
      chrome.tabs.create({
        "url": url
      });
    }
  }


  /**
   * Log the current settings.
   */
  function logSettings(reason) {
    console.log(reason + " language='" + dictCc.language + "' direction='" + dictCc.direction + "' meta='" + dictCc.metaModifier + "' shift='" + dictCc.shiftModifier + "' ctrl='" +
      dictCc.ctrlModifier + "' alt='" + dictCc.altModifier + "' contextmenu='" + dictCc.contextMenuSearch + "' searchtextfield='" + dictCc.searchInTextField + "' active='" + dictCc.active + "'" +
      " fontsize='" + dictCc.fontSize + "' newtab='" + dictCc.openInNewTab + "'" + "' centered='" + dictCc.tooltipCentered + "' onlydoubleclick='" + dictCc.onlyDbClick + "'");
  }
}
