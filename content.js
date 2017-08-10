// ipt Tooltip class.

var iptTooltip = {

  /*** Members ***/
  tooltipID: {
    "tooltip": "ipt_tooltip",
    "content": "ipt_tooltip_content",
  },
  tooltipVisible: false,
  cssLoaded: false,
  employee: null,
  currentWidth: 0,
  currentHeight: 0,
  currentLookup: null,
  windowEvent: null,


  /*** Methods ***/
  init: function() {
    // Query background page here; no stored variables yet.
    iptTooltip.onWindowResize();
    // Query backend initially.
    iptTooltip.lookupCode(null);

    window.addEventListener("resize", iptTooltip.onWindowResize);
    document.addEventListener("dblclick", iptTooltip.onDbClick);
    document.addEventListener("mouseup", iptTooltip.onMouseUp);
  },

  // Provide easy access to element by id.
  // @param id of the needed element.
  $: function(id) {
    return document.getElementById(id);
  },

  // If the window resize, determine the new window size.
  onWindowResize: function() {
    chrome.runtime.sendMessage({
      resize: true
    }, function(response) {
      if (response) {
        console.log("width: " + response.width);
        console.log("height: " + response.height);
      }
    })
  },

  onDbClick: function(evt) {
    iptTooltip.onMouseUp(evt);
  },

  onMouseUp: function(evt) {
    iptTooltip.windowEvent = evt;

    // Determine Tooltip position.
    var range = window.getSelection().getRangeAt(0);
    iptTooltip.setTooltipPosition(range);

    // Selected string text.
    var selection = (document.selection && document.selection.createRange().text) ||
      (window.getSelection && window.getSelection().toString()).trim();

    // Validate if selection is code.
    if (/^[A-Z]{3}/.test(selection) && (iptTooltip.windowEvent.type == "dblclick")) {
      iptTooltip.lookupCode(selection);
    } else {
      // Hide Tooltip if mouse presses somewhere else.
      if (!iptTooltip.isChildFrom(iptTooltip.windowEvent.srcElement, iptTooltip.$(iptTooltip.tooltipID.tooltip))) {
        iptTooltip.displayTranslationTooltip(false);
        iptTooltip.removeTooltip();
      }
    }
  },

  lookupCode: function(selection) {

    // Save current lookup.
    iptTooltip.currentLookup = selection;

    // Query background page for name code.
    chrome.runtime.sendMessage({
      getEmployee: true,
      code: selection
    }, function(response) {
      iptTooltip.fillDataToTooltip(response);
    })
  },

  // get Range position method.
  getRangePosition: function(range) {
    var offset, left, top, right, bottom;

    offset = range.getBoundingClientRect();

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

  setTooltipPosition: function(range) {
    var rangePosition = iptTooltip.getRangePosition(range);

    var rangeLeft = rangePosition.left;
    var rangeTop = rangePosition.top;
    var rangeRight = rangePosition.right;
    var rangeBottom = rangePosition.bottom;


    // Build the tooltip if not exists.
    //
    var obj = iptTooltip.$(iptTooltip.tooltipID.tooltip);

    if (obj == null) {
      iptTooltip.createTooltip();
      iptTooltip.displayTranslationTooltip(false);
      obj = iptTooltip.$(iptTooltip.tooltipID.tooltip);
    }

    // do some positioning.
    // Display below the selection.
    obj.style.top = (rangeBottom + 10) + "px";
    if (((rangeLeft + 360) > iptTooltip.currentWidth) && (rangeLeft > 360)) {
      obj.style.left = (rangeRight - 360) + "px";
    } else {
      obj.style.left = (rangeLeft) + "px";
    }
  },

  createTooltip: function() {
    // Load the needed stylesheet.
    //
    if (!iptTooltip.cssLoaded) {
      var stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.type = "text/css";
      stylesheet.href = chrome.extension.getURL("content.css");
      document.head.appendChild(stylesheet);
      iptTooltip.cssLoaded = true;
    }

    // Build the content container for the result table.
    //
    var tooltip_content = document.createElement("div");
    tooltip_content.id = iptTooltip.tooltipID.content;

    // Build the base container and add the elements.
    //
    var tooltip_container = document.createElement("div");
    tooltip_container.id = iptTooltip.tooltipID.tooltip;
    tooltip_container.appendChild(tooltip_content);

    // Insert the tooltip to the page.
    //
    document.body.insertBefore(tooltip_container, document.body.firstChild);
  },

  // Remove the translation tooltip.
  //
  removeTooltip: function() {
    var obj = iptTooltip.$(iptTooltip.tooltipID.tooltip);
    if (obj != null) {
      try {
        obj.parentNode.removeChild(obj);
      } catch (ex) {
        console.log("Tooltip can not be removed. " + ex);
      }
    }
  },

  fillDataToTooltip: function(data) {

    if (data) {
      console.log(data);

      var content_container = iptTooltip.$(iptTooltip.tooltipID.content);

      var descNode = document.createElement("h3");
      var descText = document.createTextNode(data.name + "(" + data.code + ")");
      descNode.appendChild(descText);
      content_container.appendChild(descNode);

      var funcNode = document.createElement("p");
      var funcText = document.createTextNode(data.function);
      funcNode.appendChild(funcText);
      content_container.appendChild(funcNode);

      var pictureNode = document.createElement("img");
      pictureNode.setAttribute("src", data.picture);
      pictureNode.setAttribute("alt", data.name);
      pictureNode.setAttribute("width", "320");
      pictureNode.setAttribute("height", "240");

      content_container.appendChild(pictureNode);

      iptTooltip.displayTranslationTooltip(true);
    }
  },

  // Show or hide the translation tooltip.
  // @param visible state of the translation tooltip.
  displayTranslationTooltip: function(visible) {
    var obj = iptTooltip.$(iptTooltip.tooltipID.tooltip);

    if (obj != null) {
      if (visible) {
        obj.style.display = "block";
        obj.style.opacity = 1;
        iptTooltip.tooltipVisible = true;
      } else {
        obj.style.display = "none";
        iptTooltip.tooltipVisible = false;
      }
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
  }
}

iptTooltip.init();
