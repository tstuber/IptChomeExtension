function click(e) {
  var input = document.getElementById("search");
  fillDetails(input.value);
}

function enter(e) {
  if (e.keyCode == 13) {
    var input = document.getElementById("search");
    fillDetails(input.value);
  }
}

function fillDetails(searchCode) {
  // Query background page for name code.
  chrome.runtime.sendMessage({
    getEmployee: true,
    code: searchCode
  }, function(response) {
    if(response) {
      var details = document.getElementById("details");
      details.innerHTML = "<b>" + response.name + "</b><br/>" + response.function+"<br/><img src='" + response.picture + "'></img>";
    }
  })
}

function initialize() {
  // Query background page for name code.
  chrome.runtime.sendMessage({
    getAllEmployees: true,
  }, function(response) {

    if (response) {
      console.log(response);
      addOptions(response);
    } else {
      console.log("NO RESPONSE FROM getAllEmployees")
    }
  })
}

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

document.getElementById("search").addEventListener("input", click);
document.getElementById("search").addEventListener("keyup", enter);
initialize();

//////// TESSTE
document.getElementById("search").addEventListener("search",
  function(event) {
    if (event.type === "search") {
      if (event.currentTarget.value !== "") {
        console.log("search with " + event.currentTarget.value);
      } else {
        // Clear search / details.
        resetPopupDetails();
      }
    }
  });

function resetPopupDetails() {

  // Clear search input.
  var search = document.getElementById("search");
  search.value = "";

  // Clear details.
  var obj = document.getElementById("details");
  obj.innerHTML = "";
}

// Workaround for datalist and template to limit number of shown entries.
// Since there is no proper solution (and jQuery's autocomplete not an option),
// the following snipped does the job.
var search = document.querySelector('#search');
var results = document.querySelector('#searchresults');
var templateContent = document.querySelector('#resultstemplate').content;

// search.addEventListener('input', function handler(event) {
//   console.log("Item selected");
// });
search.addEventListener('keyup', function handler(event) {
  while (results.children.length) results.removeChild(results.firstChild);
  var inputVal = new RegExp(search.value.trim(), 'i');
  var set = Array.prototype.reduce.call(templateContent.cloneNode(true).children, function searchFilter(frag, item, i) {
    if (inputVal.test(item.textContent) && frag.children.length < 6) frag.appendChild(item);
    return frag;
  }, document.createDocumentFragment());
  results.appendChild(set);
});
