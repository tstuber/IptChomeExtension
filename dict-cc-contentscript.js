 /*********************************************************/
/*********************************************************/
var dictCcMain = {

  /************************ Members ************************/
  tooltipID: {
    "tooltip": "dict_cc_translation_tooltip",
    "content": "dict_cc_translation_content",
    "contentRow": "dict_cc_translation_content_row",
    "forwardLink": "dict_cc_translation_forward",
    "searchText": "dict_cc_translation_search_text",
    "tooltipClose": "dict_cc_translation_close",
    "tooltipPeak": "dict_cc_translation_peak",
    "tooltipNav": "dict_cc_translation_nav",
    "tooltipFontSize": "dict_cc_translation_font_size",
    "dictFillBox": "dict_cc_fill_box",
    "changeLanguage": "dict_cc_change_language",
    "detectedLanguageLink": "dict_cc_detected_language_link"
  },

  dictCc: {
    "address": "http://www.dict.cc/"
  },
  lastSearch: "",
  currentSearch: "",
  currentLanguage: "",
  detectedLanguage: null,
  openLinksInNewTab: false,
  tooltipCentered: false,
  tooltipVisible: false,
  languageSelect: null,
  ignoreModifier: false,
  currentWidth: 0,
  currentHeight: 0,
  windowEvent: null,
  onlyDbClick: false,
  textfieldSelection: false,
  searchInTextField: false,

  /************************ Methods ************************/
  // init()
  init: function() {
    // Query the background page, for the detected language of the current tab, the open in new tab flag and determine the window size by invoking the onWindowResize function.
    chrome.extension.sendRequest({
      "action": "detectedLanguage"
    }, function(language) {
      dictCcMain.detectedLanguage = language;
    });
    chrome.extension.sendRequest({
      "action": "openLinksInNewTab"
    }, function(tab) {
      dictCcMain.openLinksInNewTab = tab;
    });
    chrome.extension.sendRequest({
      "action": "centered"
    }, function(centered) {
      dictCcMain.tooltipCentered = centered;
    });
    chrome.extension.sendRequest({
      "action": "onlyDbClick"
    }, function(active) {
      dictCcMain.onlyDbClick = active;
    });
    chrome.extension.sendRequest({
      "action": "searchInTextField"
    }, function(active) {
      dictCcMain.searchInTextField = active;
    });
    dictCcMain.onWindowResize();

    // Stick a listener for the mouse up and key down event.
    // window.addEventListener("resize", dictCcMain.onWindowResize);
    document.addEventListener("mouseup", dictCcMain.onMouseUp);
    document.addEventListener("dblclick", dictCcMain.onDbClick);

    // Add a listener for messages from the background page.
    chrome.extension.onMessage.addListener(function(request, sender, callback) {
      // Set the ignore modifier flag.
      dictCcMain.ignoreModifier = true;

      // Create a mouse event.
      var evt = document.createEvent("MouseEvents");
      evt.initMouseEvent("mouseup", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
      dictCcMain.onMouseUp(evt);
    });
  },

  // Provide easy access to element by id.
  // @param id of the needed element.
  $: function(id) {
    return document.getElementById(id);
  },

  // Send a log request to the background page.
  // @param message that should be logged.
  log: function(message) {
    chrome.extension.sendRequest({
      "action": "log",
      "message": message.toString()
    }, function() {});
  },

  // If the window resize, determine the new window size.
  onWindowResize: function() {
    chrome.extension.sendRequest({
      "action": "resize"
    }, function(size) {
      dictCcMain.currentWidth = size.width;
      dictCcMain.currentHeight = size.height;
    });
  },

  // Handles the users db-click event.
  // Just call the on onMouseUp method, with the db-click-event.
  onDbClick: function(evt) {
    if (dictCcMain.onlyDbClick) {
      dictCcMain.onMouseUp(evt);
    }
  },

  // Handles the user mouse up event.
  // Check if the user selected a single word, if so, try to translate it.
  onMouseUp: function(evt) {
    dictCcMain.windowEvent = evt;
    console.log("HIIIIIIIIT");

    // Verify that if the function is called from the onkeydown event only control keys are accepted otherwise just return. ATTENTION: onkeydown is currently deactivated, because i don't like it.
    //
    if (dictCcMain.windowEvent.button == undefined) {
      if (!dictCcMain.windowEvent.metaKey && !dictCcMain.windowEvent.shiftKey && !dictCcMain.windowEvent.ctrlKey && !dictCcMain.windowEvent.altKey) {
        return;
      }
    }

    // Return if the source element is the detected language link because the tooltip will be updated from the searchAgainWithAnotherLanguage function.
    //
    if ((dictCcMain.windowEvent.srcElement != null) && (dictCcMain.windowEvent.srcElement.id == dictCcMain.tooltipID.detectedLanguageLink)) {
      return;
    }

    // Get the user selection and backup the selection range.
    //
    var selection = window.getSelection();
    var bak = document.createRange();

    if (selection.rangeCount > 0) {
      bak = selection.getRangeAt(0);
    }

    var selectionString = selection.toString().trim();
    var rangeString = bak.toString().trim();
    dictCcMain.textfieldSelection = (rangeString.length < 1);

    // Store the last search.
    //
    dictCcMain.lastSearch = dictCcMain.currentSearch;
    var searchText = dictCcMain.textfieldSelection ? selectionString : rangeString;

    // Verify that the selection is valid.
    //
    if (selection.type == "Range" &&
      searchText.length > 2 &&
      searchText.split(" ").length < 4 &&
      dictCcMain.isValidPage() &&
      (searchText != dictCcMain.lastSearch || !dictCcMain.tooltipVisible) &&
      ((dictCcMain.textfieldSelection && dictCcMain.searchInTextField) || !dictCcMain.textfieldSelection) &&
      (((dictCcMain.windowEvent.type == "dblclick") && dictCcMain.onlyDbClick) || !dictCcMain.onlyDbClick)) {

      // Query the background page, for the language select element if not already exists.
      //
      if (dictCcMain.languageSelect == null) {
        chrome.extension.sendRequest({
          "action": "getLanguageSelectOptions"
        }, function(options) {
          dictCcMain.languageSelect = document.createElement("select");
          dictCcMain.languageSelect.onchange = dictCcMain.searchAgainWithAnotherLanguage;
          dictCcMain.languageSelect.innerHTML = options;
          dictCcMain.languageSelect.style.marginTop = "-2px";
        });
      }

      // Set the new tooltip position.
      //
      dictCcMain.setTranslationTooltipPosition(selection.getRangeAt(0));

      // Execute the search request.
      //
      dictCcMain.doSearch(searchText, dictCcMain.windowEvent);

      // Restore the selection range.
      //
      if (!dictCcMain.textfieldSelection) {
        selection.removeAllRanges();
        selection.addRange(bak);
      }
    } else {
      // If the translation tooltip is visible, hide it if not hit the mouse position.
      //
      if (!dictCcMain.isChildFrom(dictCcMain.windowEvent.srcElement, dictCcMain.$(dictCcMain.tooltipID.tooltip))) {
        dictCcMain.displayTranslationTooltip(false);
        dictCcMain.removeTranslationTooltip();
      }
    }
  },

  // Execute the search request to the background page.
  // @param the text that should been translated and the window event.
  doSearch: function(search, winEvent) {
    // Set the current search.
    //
    dictCcMain.currentSearch = search;

    // Query the background page, for the active state.
    //
    chrome.extension.sendRequest({
      "action": "isActive",
      "meta": winEvent.metaKey,
      "shift": winEvent.shiftKey,
      "ctrl": winEvent.ctrlKey,
      "alt": winEvent.altKey,
      "ignoreModifier": dictCcMain.ignoreModifier
    }, function(active) {
      dictCcMain.displayLoadingTooltip(active);
    });

    // Query the background page, for the current language.
    //
    chrome.extension.sendRequest({
      "action": "getLanguage"
    }, function(language) {
      dictCcMain.currentLanguage = language;
    });

    // Send a request to the background page, to translate the selection.
    //
    chrome.extension.sendRequest({
      "action": "translateSelection",
      "selection": search
    }, function(data) {
      dictCcMain.fillTranslationTooltip(data);
    });

    // Finally reset the ignore modifier flag, if set.
    //
    if (dictCcMain.ignoreModifier) {
      dictCcMain.ignoreModifier = false;
    }
  },

  // Determine if the given child is child node from the given element.
  // @param child node
  // @param element
  isChildFrom: function(child, element) {
    do {
      if (child == element) {
        return true;
      }
    }
    while (child = child.parentNode);

    return false;
  },

  // If the extension is active, display loading..
  // @param active state.
  displayLoadingTooltip: function(active) {
    if (active) {
      var loading_container = document.createElement("div");
      loading_container.className = "dict_cc_nothing_found";
      loading_container.innerHTML = chrome.i18n.getMessage("loading") + "<span class='dict_cc_translation_loading'></span>"

      dictCcMain.$(dictCcMain.tooltipID.content).innerHTML = "";
      dictCcMain.$(dictCcMain.tooltipID.content).appendChild(loading_container);
      dictCcMain.$(dictCcMain.tooltipID.searchText).innerHTML = "";
      dictCcMain.$(dictCcMain.tooltipID.forwardLink).innerHTML = "";
      dictCcMain.displayTranslationTooltip(true);
    }
  },

  // Fill the translation tooltip with the new translation data.
  // @param html object of the translation data.
  fillTranslationTooltip: function(data) {
    // Build dummy document to parse the XMLHttpRequest response.
    //
    var dummy = document.implementation.createHTMLDocument("", "dummy", null);
    dummy.documentElement.innerHTML = data;

    // Create result table.
    //
    var translation_table = document.createElement("table");
    translation_table.rules = "none";

    var translation_table_body = document.createElement("tbody");

    // Try to extract the search result number.
    //
    var result_num = 0;
    try {
      result_num = parseInt(dummy.getElementsByTagName("h1")[1].getElementsByTagName("b")[1].innerHTML);
    } catch (ex) {
      dictCcMain.log("Unable to parse the result number. -> No result found! " + ex);
    }

    // Extract the needed search result elements.
    //
    var table_rows = dummy.getElementsByTagName("tr");
    var pointer = 1;

    for (var i = 0; i < table_rows.length; i++) {
      if (table_rows[i].id == ("tr" + pointer) && pointer <= 5) {
        try {
          // Get a list of all columns in the row and create a new row for the result.
          //
          var table_columns = table_rows[i].getElementsByTagName("td");
          var table_row = document.createElement("tr");
          table_row.id = dictCcMain.tooltipID.contentRow + pointer;

          // Build column 1.
          //
          var table_column1 = document.createElement("td");
          dictCcMain.planeCopy(table_column1, table_columns[1]);
          dictCcMain.adjustLink(table_column1, dictCcMain.dictCc.address.replace("www", dictCcMain.currentLanguage));

          // Build column 2.
          //
          var table_column2 = document.createElement("td");
          dictCcMain.planeCopy(table_column2, table_columns[2]);
          dictCcMain.adjustLink(table_column2, dictCcMain.dictCc.address.replace("www", dictCcMain.currentLanguage));

          // Add the columns to the row an the row to the table.
          //
          table_row.appendChild(table_column1.firstChild);
          table_row.appendChild(table_column2.firstChild);
          translation_table_body.appendChild(table_row);
          pointer++;
        } catch (ex) {
          dictCcMain.log("Unknown parsing error. " + ex);
        }
      }
    }

    // Add components to the table.
    //
    translation_table.appendChild(translation_table_body);

    // Fill the translation tooltip with the new translation.
    //
    var search_txt = document.createElement("b");
    search_txt.innerHTML = dictCcMain.currentSearch + ":";

    var content_container = dictCcMain.$(dictCcMain.tooltipID.content);
    content_container.innerHTML = "";

    // If no translation results available, display no result and other language selection, otherwise display the translation.
    //
    if (result_num == 0) {
      search_txt.innerHTML = search_txt.innerHTML + chrome.i18n.getMessage("no_search_results");
      content_container.appendChild(dictCcMain.getLanguageSelect());
    } else {
      content_container.appendChild(translation_table);
    }

    // Set the search text and update bottom navigation.
    //
    var search_text_container = dictCcMain.$(dictCcMain.tooltipID.searchText);
    search_text_container.appendChild(search_txt);
    var forward_link_container = dictCcMain.$(dictCcMain.tooltipID.forwardLink);
    forward_link_container.innerHTML = "<a href='" + dictCcMain.dictCc.address.replace("www", dictCcMain.currentLanguage) + "?s=" + dictCcMain.currentSearch + "'" + (dictCcMain.openLinksInNewTab ? " target='_blank'" : "") + ">[" + (pointer - 1) + " von " + result_num + "] " + chrome.i18n.getMessage("more") + "</a>";

    // Finally change the font size.
    //
    chrome.extension.sendRequest({
      "action": "getFontSize"
    }, function(fontSize) {
      dictCcMain.fontChanger(search_text_container, fontSize);
      dictCcMain.fontChanger(forward_link_container.childNodes[0], fontSize);
      dictCcMain.fontChanger(content_container, fontSize);
    });
  },

  // Show or hide the translation tooltip.
  // @param visible state of the translation tooltip.
  displayTranslationTooltip: function(visible) {
    var obj = dictCcMain.$(dictCcMain.tooltipID.tooltip);

    if (obj != null) {
      if (visible) {
        obj.style.display = "block";
        dictCcMain.tooltipVisible = true;

        obj.style.opacity = 0;
        var effect = window.setInterval(function() {
          obj.style.opacity = Number(obj.style.opacity) + 0.1;
          if (Number(obj.style.opacity) >= 1.0) {
            clearInterval(effect);
            effect = null;
          }
        }, 30);
      } else {
        obj.style.display = "none";
        dictCcMain.tooltipVisible = false;
      }
    }
  },

  // Remove the translation tooltip.
  removeTranslationTooltip: function() {
    var obj = dictCcMain.$(dictCcMain.tooltipID.tooltip);
    if (obj != null) {
      try {
        obj.parentNode.removeChild(obj);
      } catch (ex) {
        dictCcMain.log("Unable to remove the translation tooltip. " + ex);
      }
    }
  },

  // Place the tooltip at the current selection position.
  // @param the selection range.
  setTranslationTooltipPosition: function(range) {
    // Determine the range location.
    var rangePosition = dictCcMain.getRangePosition(range, dictCcMain.textfieldSelection);

    var rangeLeft = rangePosition.left;
    var rangeTop = rangePosition.top;
    var rangeRight = rangePosition.right;
    var rangeBottom = rangePosition.bottom;

    // Build the tooltip if not exists.
    var obj = dictCcMain.$(dictCcMain.tooltipID.tooltip);

    if (obj == null) {
      dictCcMain.buildTranslationTooltip();
      dictCcMain.displayTranslationTooltip(false);
      obj = dictCcMain.$(dictCcMain.tooltipID.tooltip);
    }

    // Assign the tooltip position.
    if (!dictCcMain.tooltipCentered) {
      // Display below the selection.
      obj.style.top = (rangeBottom + 10) + "px";
      if (((rangeLeft + 360) > dictCcMain.currentWidth) && (rangeLeft > 360)) {
        dictCcMain.peakRight();
        obj.style.left = (rangeRight - 360) + "px";
      } else {
        dictCcMain.peakLeft();
        obj.style.left = (rangeLeft) + "px";
      }
    } else {
      // Display the tooltip centered.
      dictCcMain.peakHidden();
      obj.style.left = document.body.scrollLeft + ((window.innerWidth / 2) - 160) + "px";
      if (rangeTop > (document.body.scrollTop + (window.innerHeight / 3))) {
        obj.style.top = document.body.scrollTop + "px";
      } else {
        obj.style.top = (document.body.scrollTop + (window.innerHeight / 2)) + "px";
      }
    }
  },

  // Get the position of the given range.
  // @param range to determine the position from.
  // @param is the range from a text field.
  getRangePosition: function(range, tf_selection) {
    var offset, left, top, right, bottom;

    // Is the range from a text field ?
    if (tf_selection) {
      // Create a dummy element.
      var dummy = document.createElement("em");
      dummy.innerHTML = "dummy";
      range.insertNode(dummy);
      offset = dummy.getBoundingClientRect();
      dummy.parentNode.removeChild(dummy);
    } else {
      offset = range.getBoundingClientRect();
    }

    left = offset.left + document.body.scrollLeft;
    top = offset.top + document.body.scrollTop;
    right = offset.right + document.body.scrollLeft;
    bottom = offset.bottom + document.body.scrollTop;

    return {
      "left": left,
      "top": top,
      "right": right,
      "bottom": bottom
    };
  },

  // Assign the peak right class name.
  peakRight: function() {
    dictCcMain.$(dictCcMain.tooltipID.tooltipPeak).className = "dict_cc_peak_right";
  },

  // Assign the peak left class name.
  peakLeft: function() {
    dictCcMain.$(dictCcMain.tooltipID.tooltipPeak).className = "dict_cc_peak_left";
  },

  // Assign the peak hidden class name.
  peakHidden: function() {
    dictCcMain.$(dictCcMain.tooltipID.tooltipPeak).className = "dict_cc_peak_hidden";
  },

  // Build the translation tooltip.
  buildTranslationTooltip: function() {
    // Load the needed stylesheet.
    //
    var stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.type = "text/css";
    stylesheet.href = chrome.extension.getURL("dict-cc-styles.css");
    document.head.appendChild(stylesheet);

    // Build the tooltip peak container.
    //
    var tooltip_peak = document.createElement("div"); // Peak
    tooltip_peak.id = dictCcMain.tooltipID.tooltipPeak;
    tooltip_peak.className = "dict_cc_peak_left";

    // Build the header container for the close button, search text and font size.
    //
    var tooltip_header_search_text_container = document.createElement("div"); // Search text
    tooltip_header_search_text_container.id = dictCcMain.tooltipID.searchText;
    tooltip_header_search_text_container.className = dictCcMain.tooltipID.dictFillBox;

    var tooltip_header_close_button = document.createElement("button"); // Close button
    tooltip_header_close_button.id = dictCcMain.tooltipID.tooltipClose;
    tooltip_header_close_button.onclick = function() {
      dictCcMain.displayTranslationTooltip(false);
      dictCcMain.removeTranslationTooltip();
    }
    tooltip_header_close_button.onmousemove = function() {
      dictCcMain.headerNavigationHover(this);
    }
    tooltip_header_close_button.onmouseout = function() {
      dictCcMain.headerNavigationHoverOut(this);
    }

    var tooltip_header_close_container = document.createElement("div");
    tooltip_header_close_container.className = "dict_cc_exact_box";
    tooltip_header_close_container.appendChild(tooltip_header_close_button);

    var tooltip_header_font_size_button = document.createElement("button"); // Font size button
    tooltip_header_font_size_button.id = dictCcMain.tooltipID.tooltipFontSize;
    tooltip_header_font_size_button.onclick = function() {
      // Request the font size increase and change the font size of the tooltip.
      //
      chrome.extension.sendRequest({
        "action": "increaseFontSize"
      }, function(fontSize) {
        dictCcMain.fontChanger(dictCcMain.$(dictCcMain.tooltipID.tooltip), fontSize);
        tooltip_header_font_size_button.title = "+" + (parseInt(tooltip_header_font_size_button.title.replace(/\+/, "")) + fontSize);
      });
    }
    tooltip_header_font_size_button.onmousemove = function() {
      dictCcMain.headerNavigationHover(this);
    }
    tooltip_header_font_size_button.onmouseout = function() {
      dictCcMain.headerNavigationHoverOut(this);
    }

    var tooltip_header_font_size_container = document.createElement("div");
    tooltip_header_font_size_container.className = "dict_cc_exact_box";
    tooltip_header_font_size_container.appendChild(tooltip_header_font_size_button);

    // Fill the header.
    //
    var tooltip_header = document.createElement("div");
    tooltip_header.className = "dict_cc_box";
    tooltip_header.appendChild(tooltip_header_search_text_container);
    tooltip_header.appendChild(tooltip_header_font_size_container);
    tooltip_header.appendChild(tooltip_header_close_container);

    // Build the content container for the result table.
    //
    var tooltip_content = document.createElement("div");
    tooltip_content.id = dictCcMain.tooltipID.content;

    // Build the footer navigation
    //
    var tooltip_nav_dict_url = document.createElement("a");
    tooltip_nav_dict_url.href = dictCcMain.dictCc.address;
    tooltip_nav_dict_url.innerHTML = dictCcMain.dictCc.address;
    if (dictCcMain.openLinksInNewTab) {
      tooltip_nav_dict_url.target = "_blank";
    }

    var tooltip_nav_dict_link = document.createElement("div");
    tooltip_nav_dict_link.className = dictCcMain.tooltipID.dictFillBox;
    tooltip_nav_dict_link.appendChild(tooltip_nav_dict_url);

    var tooltip_nav_forward_link = document.createElement("div");
    tooltip_nav_forward_link.id = dictCcMain.tooltipID.forwardLink;

    var tooltip_nav = document.createElement("nav");
    tooltip_nav.id = dictCcMain.tooltipID.tooltipNav;
    tooltip_nav.className = "dict_cc_box";
    tooltip_nav.appendChild(tooltip_nav_dict_link);
    tooltip_nav.appendChild(tooltip_nav_forward_link);

    // Build the base container and add the elements.
    //
    var tooltip_container = document.createElement("div");
    tooltip_container.id = dictCcMain.tooltipID.tooltip;
    tooltip_container.appendChild(tooltip_peak);
    tooltip_container.appendChild(tooltip_header);
    tooltip_container.appendChild(tooltip_content);
    tooltip_container.appendChild(tooltip_nav);

    // Insert the tooltip to the page.
    //
    document.body.insertBefore(tooltip_container, document.body.firstChild);

    // Finally change the font size.
    //
    chrome.extension.sendRequest({
      "action": "getFontSize"
    }, function(fontSize) {
      dictCcMain.fontChanger(tooltip_container, fontSize);
      tooltip_header_font_size_button.title = "+" + fontSize;
    });
  },

  // Prefix all links of the element with an adjustment.
  // @param element with the links to adjust.
  // @param the link adjustment.
  adjustLink: function(element, adjustment) {
    // Get a list of all links in the element.
    //
    var list = element.getElementsByTagName("a");

    // Adjust the links by prefix the adjustment.
    //
    for (var i = 0; i < list.length; i++) {
      var s = list[i].href.split("?s=");

      list[i].href = adjustment + "?s=" + s[1];
      if (dictCcMain.openLinksInNewTab) {
        list[i].target = "_blank";
      }
    }
  },

  // Create the language select option and mark the current language.
  getLanguageSelect: function() {
    // Build the main language select container.
    //
    var container = document.createElement("div");
    container.id = dictCcMain.tooltipID.changeLanguage;

    // If the language of the current page was detected, add a language suggestion for the page language.
    //
    if (dictCcMain.detectedLanguage != null) {
      // Build the language suggestion.
      //
      var languageSuggestionSpan1 = document.createElement("span");
      languageSuggestionSpan1.innerHTML = "\"" + dictCcMain.currentSearch + "\"" + chrome.i18n.getMessage("search_question_phrase1");

      var languageSuggestionSpan2 = document.createElement("span");
      languageSuggestionSpan2.innerHTML = chrome.i18n.getMessage("search_question_phrase2");

      var detectedLanguageLink = document.createElement("a");
      detectedLanguageLink.onclick = function() {
        for (var i = 0; i < dictCcMain.languageSelect.children.length; i++) {
          var child = dictCcMain.languageSelect.children[i];
          if (child.value == dictCcMain.detectedLanguage.key) {
            child.selected = "true";
            break;
          }
        }

        // Search again with the detected language.
        //
        dictCcMain.searchAgainWithAnotherLanguage();
      };
      detectedLanguageLink.style.cursor = "pointer";
      detectedLanguageLink.innerHTML = "<b id='" + dictCcMain.tooltipID.detectedLanguageLink + "'>" + dictCcMain.detectedLanguage.value + "</b>";

      var languageSuggestionContainer = document.createElement("div");
      languageSuggestionContainer.style.padding = "3px 0";
      languageSuggestionContainer.appendChild(languageSuggestionSpan1);
      languageSuggestionContainer.appendChild(detectedLanguageLink);
      languageSuggestionContainer.appendChild(languageSuggestionSpan2);

      // Add the language suggestion to main container.
      //
      container.appendChild(languageSuggestionContainer);
    }

    // Mark the current translation language.
    //
    for (var i = 0; i < dictCcMain.languageSelect.children.length; i++) {
      var child = dictCcMain.languageSelect.children[i];
      if (child.value == dictCcMain.currentLanguage) {
        child.selected = "true";
        break;
      }
    }

    // Now build the language change.
    //
    var changeLanguageSpan = document.createElement("span");
    changeLanguageSpan.innerHTML = chrome.i18n.getMessage("change_language");

    var changeLanguageContainer = document.createElement("div");
    changeLanguageContainer.style.padding = "3px 0";
    changeLanguageContainer.appendChild(changeLanguageSpan);
    changeLanguageContainer.appendChild(dictCcMain.languageSelect);

    container.appendChild(changeLanguageContainer);
    return container;
  },

  // Search again if the user selected another language.
  searchAgainWithAnotherLanguage: function() {
    var language = dictCcMain.languageSelect.children[dictCcMain.languageSelect.selectedIndex].value;

    // Set the ignore modifier, to invoke the search with another language without holding the modifier keys.
    //
    dictCcMain.ignoreModifier = true;

    // Query the background page, to set the new language.
    //
    chrome.extension.sendRequest({
      "action": "setLanguage",
      "language": language
    }, function() {});

    // Execute the last search again with the new language.
    //
    dictCcMain.doSearch(dictCcMain.currentSearch, dictCcMain.windowEvent);
  },

  // Change the background image of the object to active.
  // @param hovered object.
  headerNavigationHover: function(obj) {
    if (!obj.style.backgroundImage) {
      obj.style.backgroundImage = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAAAeCAYAAABTwyyaAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA7ZJREFUeNrMWEtIW0EUnTyj8RONH6SgorUkqLuCC4t0J9RFu5JQN64riJt+oIviqrhw0Z0I3buxDd0b6E4kLoTuVBCJFMGF4C9+omJ6z/ROGCfvmZfHe7UHDpnMm895d+69M/NChUJBPATW1tbMqhfEUeIwcYDrNoirxGViWm8cFg+Px8Rp4iQxajx7xnxD/EqcJ2b/B+EQ/Zk4UaYdXug98RFxBuKtBxY+7UK0jgnuI8I2vqYjRBwhPicOEvuJnfxsj7hJXCeuEH8SHQNmaGjIzqcn9Yqenh6xu7srytShT/o+V3lNHCeOOTyPM1/x/x/EJeI3l9Yb1X0aAmtra0U8Hhfb29t/J6ByVVWVKR59Ru2EP+HlmCJGKlhGvOBLDiYE0U6Z9sP6HwiD0OrqatHX1yfrLMsS19fXJauAvqaPPyXOEd9WKFohwn3neKz7MGBWwNK3t7dSPIiysr7ZN2xY+hMx6UPQqTE+urC8J1hGhCd9HDupMoADNkqChlxFuQeIMurs+lpaIE4FYJgpHtsOq2b2QCBC8NbWliTKKjjNvhanvHGPPu3G58d5DhPYxnN6cF5eXt7xaZRRZwQn+ixbnKfHvKiKxWJyKROJhJ1V9GwzYlOf5m38TmYxYVOHPmmLNxdPaGtrE5FIRBI5uL6+3qmp0xxIm4sVTLnIfWRwDnoRDZFIWThdIm0hkKLRqFNzpzmyfPb4oruNDXLcZkY/ZPXbtezo6BANDQ3i6urKdgkhMhQKiVwuJ87Pz0V7e7t0nYODA/kiBvrvEQUhH9h1KjrWdpojwZIQhl9ENcoQqIC65uZmWT4+PhYXFxeitbW12Pbk5MQcstPF2SVtinObx0useXZ2VgxCHVgJiATQBquC6Ie7NDU1/ZNjpcWnvDvA5BC+v78vcymEwvoKsDaew7+7u7tFb2+vDFD1UqqsYc9v4WE+msZ1ayNDQFRXV5e0ogq8w8NDKaqurk4+x4vBVYCamhr5AqptPp/X59kMwuLrekVjY6P8hShsANlsVgZbS0tL8TnE3dzciNPT02I/uAvcBiuBFUEbDetBCF/RgxIWhb8qURCEwISFIRppEO5zdHRUkj0QlLA02mLVNKz4LTyUyWSwHae87p4ugAtGkrJIwW+LF/jmkg9AdJ7HLgThKoKvWwsBCF+o4Crn+Tw+zy7jF1LqXBG0cNxUZn0Sn+KxdoISbl6Wf/F167eHy7Ly6QWXl2VfhSvLvyNmynyesMseS0H5tBvhQgvY7359EPIbfwQYAFwfR83YPBXTAAAAAElFTkSuQmCC)";
    }
  },

  // Remove the active background image.
  // @param hovered object.
  headerNavigationHoverOut: function(obj) {
    obj.style.backgroundImage = null;
  },

  // Increase the font of all subnodes by the increase value.
  // @param parent element.
  // @param increase value.
  fontChanger: function(element, increase) {
    for (var i = 0, children = element.childNodes; i < children.length; i++) {
      if (children[i].tagName) {
        if (children[i].hasChildNodes()) {
          dictCcMain.fontChanger(children[i], increase);
        }
      }
    }
    dictCcMain.increaseFont(element, increase);
  },

  // Increase the font of the given element.
  // @param element which font should been increased.
  // @param the value to increase.
  increaseFont: function(element, increase) {
    var property_value = document.defaultView.getComputedStyle(element, null).getPropertyValue("font-size");
    element.style.fontSize = (parseInt(property_value.replace(/px/, "")) + increase) + "px";
  },

  // Check if the current page is valid to display the tooltip.
  isValidPage: function() {
    var valid = true;

    return valid;
  },

  // Copy the given element including all sub elements and add them to the parent node.
  // @param parent node.
  // @param element which should be copied.
  planeCopy: function(parent, element) {
    var copy = null;
    var elementName = element.nodeName.toLowerCase();

    // Switch element type.
    switch (element.nodeType) {
      case 1:
        // Element node.
        if (elementName != "div") {
          copy = document.createElement(elementName);
          if (elementName == "a") {
            var hrefMatch = element.outerHTML.match(/href="(.*?)"/);
            copy.href = (hrefMatch.length > 1) ? hrefMatch[1] : "";
          }
          copy.nodeValue = element.nodeValue;
        }
        break;
      case 3:
        // Text node.
        copy = document.createTextNode(element.nodeValue);
        break;
    }

    // Append element copy to parent.
    if (copy != null) {
      parent.appendChild(copy);

      // Copy also all sub elements.
      if (element.hasChildNodes()) {
        var list = element.childNodes;
        for (var i = 0; i < list.length; i++) {
          dictCcMain.planeCopy(copy, list[i]);
        }
      }
    }
  }
}


/*********************************************************/
/*********************************************************/
dictCcMain.init();
