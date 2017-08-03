function loadDatalist2() {
  console.log("TSTS2"); // The function returns the product of p1 and p2
}

function enter(e) {
  if (e.keyCode == 13) {
    console.log("enter");

    var input = document.getElementById("search");
    console.log(input.value);

    // Query background page for name code.
    chrome.runtime.sendMessage({
      getEmployee: true,
      code: input.value
    }, function(response) {

      var detail = document.getElementById("details");
      details.innerHTML = response.name;

    })
  }
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

//document.getElementById("employeeInput").addEventListener("click", loadDatalist2);
document.getElementById("search").addEventListener("keyup", enter);
initialize();

// Workaround for datalist and template to limit number of shown entries.
// Since there is no proper solution (and jQuery's autocomplete not an option),
// the following snipped does the job.
var search = document.querySelector('#search');
var results = document.querySelector('#searchresults');
var templateContent = document.querySelector('#resultstemplate').content;

search.addEventListener('input', function handler(event) {
  console.log("Item selected");

  
});
search.addEventListener('keyup', function handler(event) {
    while (results.children.length) results.removeChild(results.firstChild);
    var inputVal = new RegExp(search.value.trim(), 'i');
    var set = Array.prototype.reduce.call(templateContent.cloneNode(true).children, function searchFilter(frag, item, i) {
        if (inputVal.test(item.textContent) && frag.children.length < 6) frag.appendChild(item);
        return frag;
    }, document.createDocumentFragment());
    results.appendChild(set);
});
