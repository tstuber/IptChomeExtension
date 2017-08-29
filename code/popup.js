document.getElementById("search").addEventListener("input", onInput);
document.getElementById("search").addEventListener("keyup", onKeyup);
document.getElementById("search").addEventListener("search", onSearch);

// get initial popup height.
var initBodyHeight = document.getElementsByTagName("body")[0].offsetHeight;
var initHtmlHeight = document.getElementsByTagName("html")[0].offsetHeight;

// onSearch Event handler. Only used when clear-search button is pressed.
function onSearch(event) {
  if (event.type === "search") {
    if (event.currentTarget.value !== "") {
      console.log("search with " + event.currentTarget.value);
    } else {
      resetPopup();
    }
  }
};

// OnKeyup event handler.
// Workaround for datalist and template to limit number of shown entries.
// Since there is no proper solution (and jQuery's autocomplete not an option),
// the following snipped does the job.
function onKeyup(event) {

  var search = document.querySelector('#search');
  var results = document.querySelector('#searchresults');
  var templateContent = document.querySelector('#resultstemplate').content;

  while (results.children.length) results.removeChild(results.firstChild);
  var inputVal = new RegExp(search.value.trim(), 'i');
  var set = Array.prototype.reduce.call(templateContent.cloneNode(true).children, function searchFilter(frag, item, i) {
    if (inputVal.test(item.textContent) && frag.children.length < 6) frag.appendChild(item);
    return frag;
  }, document.createDocumentFragment());
  results.appendChild(set);

  // Action if enter is pressed.
  if (event.keyCode == 13) {
    fillDetails(search.value);
  }
};

// onInput event handler.
// Is used if item is selected from dropdown.
function onInput(e) {
  var search = document.getElementById("search");
  fillDetails(search.value.toUpperCase());
}

// Resets the detail section of the popup and restores its initial height.
function resetPopup() {
  var details = document.getElementById("details");
  details.innerHTML = "";

  var body =  document.getElementsByTagName("body")[0];
  var html =  document.getElementsByTagName("html")[0];
  html.style.height = initHtmlHeight;
  body.style.height = initBodyHeight;
}

// Queries background page and fills details if requrest is successful.
function fillDetails(searchCode) {
  // Query background page for name code.
  chrome.runtime.sendMessage({
    getEmployee: true,
    code: searchCode
  }, function(response) {
    var details = document.getElementById("details");
    if (response) {
      details.innerHTML = "</br><b>" + response.name + "</b><br/>" + response.function+"<br/><img src='" + response.picture + "'></img>";
    } else if (details.innerHTML != "") {
      // If innerHTML contains values, then the details have to be reseted.
      resetPopup();
    }
  })
}

// initializes page by loading possible employees from backend.
function initialize() {
  // Query background page for name code.
  chrome.runtime.sendMessage({
    getAllEmployees: true,
  }, function(response) {
    if (response) {
      addOptions(response);
    } else {
      console.log("No response from getAllEmployees")
    }
  })
}

// Adds all possible employees to template elements.
function addOptions(employees) {

  var template = document.getElementById("resultstemplate")

  for (var i = 0; i < employees.length; i++) {
    var option = document.createElement('option');
    option.label = employees[i].name;
    option.value = employees[i].code;
    option.innerHTML = employees[i].name + " (" + employees[i].code + ")";
    template.content.appendChild(option);
  }
}

initialize();
