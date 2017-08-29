var bg = {

  /*** Members ***/
  employees: null,

  /*** Methods ***/
  init: function() {

    // load list of employees initially.
    if (bg.employees == null) {
      var xmlhttp = new XMLHttpRequest();
      xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          bg.employees = JSON.parse(this.responseText);
        }
      }
      xmlhttp.open("GET", "iptEmployees.json", true);
      xmlhttp.send();
    }

    // Register listener for message exchange.
    chrome.runtime.onMessage.addListener(
      function(msg, _, sendResponse) {

        if (msg.resize) {
          sendResponse(
            chrome.windows.getCurrent(function(win) {
              return {
                "width": win.width,
                "height": win.height
              }
            })
          )
        } else if (msg.getAllEmployees) {
          // crate a datalist with employees.
          obj = bg.getAllEmployees();
          sendResponse(obj);

        } else if (msg.getEmployee) {
          // Lookup of employees.
          obj = bg.getEmployeeByCode(msg.code);
          sendResponse(obj);
        }
        // If we don't return anything, the message channel will close, regardless
        // of whether we called sendResponse.
      });
  },

  // Gets a list of all employees.
  // TODO: Remove Slogan?
  getAllEmployees: function() {
    if (bg.employees) {
      return bg.employees;
    }
  },

  // Gets information about a specific employee.
  getEmployeeByCode: function(code) {
    // only if list of employees is loaded.
    if (bg.employees) {
      for (var i = 0; i < bg.employees.length; i++) {
        if (bg.employees[i].code == code) {
          return bg.employees[i];
        }
      }
    }
  }
}

bg.init();
