var settings = {
    "width": 900,
    "height": 600,

    "sums": {
        "opacity": 0.8,
        "font": "15px Arial",
    },

    "colours": {
        "function": "red",
        "upperSums": "#077187",
        "lowerSums": "#74A57F",
        "sumsOutline": "black"
    },

    "delta": 0.001
}

// This canvas is used to draw the grid
var gridCanvas = document.getElementById("main_canvas");
gridCanvas.width = settings.width;
gridCanvas.height = settings.height;

var grid = new Grid(gridCanvas);

// This canvas sits on top of the grid canvas and displays the estimates for
// the upper and lower integral. This is needed so that the estimates can stay
// in the same place when the grid is zoomed and scrolled
var frontCanvas = document.getElementById("front_canvas");
frontCanvas.width = settings.width;
frontCanvas.height = settings.height;
var ctx = frontCanvas.getContext("2d");

var exampleFunctions = {
    "sin(x)": function(x) {return Math.sin(x);},
    "x^3": function(x) {return 0.2*x*x*x;},
    "exp(-x^2)": function(x) {return 3*Math.exp(-x*x);},
    "|x|": function(x) {return Math.abs(x);},
    "1 / x": function(x) {return (x == 0 ? 1000 : (1 / x));},
    "3sin(x) / x": function(x) {return (x == 0 ? 3 : (3 * Math.sin(x) / x));}
};

/*
 * Add the specified class to the given element
 */
function addClass(element, className) {
    var classes = element.className.split(" ");
    if (classes.indexOf(className) === -1) {
        classes.push(className);
    }
    element.className = classes.join(" ");
}

/*
 * Remove the specified class from the given element
 */
function removeClass(element, className) {
    var classes = element.className.split(" ");
    var index = classes.indexOf(className);
    if (index !== -1) {
        classes.splice(index, 1);
    }
    element.className = classes.join(" ");
}

/*
 * Check if the contents of the textbox is an float; return true if so or show
 * an error and return false if not
 */
function validateFloat(textbox) {
    var f = parseFloat(textbox.value);
    if (isNaN(f)) {
        addClass(textbox, "error");
        return false
    }
    else {
        // Remove error class in case there was previously an error
        removeClass(textbox, "error");
        return true;
    }
}

/*
 * Like validateFloat() above, but check for an integer value
 */
function validateInteger(textbox) {
    var f = parseInt(textbox.value);
    if (isNaN(f)) {
        addClass(textbox, "error");
        return false
    }
    else {
        removeClass(textbox, "error");
        return true;
    }
}

/*
 * Return a partition of the given interval with n sub-intervals of equal width
 */
function uniformPartition(interval, n) {
    var p = [];
    var width = (interval[1] - interval[0]) / n;
    for (var i=0; i<=n; i++) {
        p.push(interval[0] + i*width);
    }
    return p;
}

/*
 * Estimate the minimum and maximum of a function over the given domain
 */
function calculateMinMax(func, domain) {
    var min = func(domain[0]);
    var max = func(domain[0]);

    for (var x = domain[0]; x<=domain[1]; x+=settings.delta) {
        var y = func(x);

        if (y < min) {
            min = y;
        }

        if (y > max) {
            max = y;
        }
    }

    return [min, max];
}

/*
 * Clear old function and sums, and draw new upper and lower sums
 */
function setFunction(func, domain, partition, drawLower, drawUpper) {
    grid.removeAll();
    grid.redraw();

    var lowerEstimate = 0;
    var upperEstimate = 0;

    // Draw upper and lower sums
    for (var i=1; i<partition.length; i++) {
        var m = calculateMinMax(func, [partition[i - 1], partition[i]]);
        var min = m[0];
        var max = m[1];

        lowerEstimate += min * (partition[i] - partition[i - 1]);
        upperEstimate += max * (partition[i] - partition[i - 1]);

        var order = [];  // The order in which to draw the sums
        if (drawUpper) {
            order.push([max, settings.colours.upperSums]);
        }
        if (drawLower) {
            order.push([min, settings.colours.lowerSums]);
        }

        // If the maximum is negative then drawing min last will result in min
        // rectangle covering up the max rectangle, so reverse the order
        if (max < 0) {
            order.reverse();
        }

        for (var j=0; j<order.length; j++) {
            var points = [
                [partition[i - 1], 0], [partition[i - 1], order[j][0]],
                [partition[i], order[j][0]], [partition[i], 0]
            ];

            grid.addShape(points, {"colour": order[j][1], "fill": true});
            grid.addShape(points, {"colour": settings.colours.sumsOutline,
                                   "fill": false});
        }
    }

    // Draw the function last so that the sums do not cover it up
    var style = {
        "colour": settings.colours.function,
        "line_width": 3
    };
    grid.addFunction(func, domain, style);

    // Show estimates for the upper and lower integrals
    ctx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
    ctx.globalAlpha = settings.sums.opacity;
    var padding = 10;
    var squareSize = 30;

    ctx.font = settings.sums.font;
    ctx.textBaseline = "middle";

    var estimates = [
        [lowerEstimate, settings.colours.lowerSums],
        [upperEstimate, settings.colours.upperSums]
    ];

    for (var i=0; i<estimates.length; i++) {
        // Round to 4dp and display in top corner
        var text = "≈ " + estimates[i][0];

        ctx.fillStyle = estimates[i][1];
        ctx.fillRect(padding, (i+1)*padding + i*squareSize, squareSize, squareSize);
        ctx.fillText(text, 2*padding + squareSize, (i+1)*padding + (0.5+i)*squareSize);
    }
    ctx.globalAlpha = 1;
}

/*
 * Update the function, domain and partition when user changes it
 */
function updateSettings() {
    console.log("updating settings");
    var startTextbox = document.getElementById("domain_start");
    var endTextbox = document.getElementById("domain_end");
    var partitionTextbox = document.getElementById("partition_size");
    var func = document.getElementById("functions_dropdown").value;
    var drawLower = document.getElementById("lower_checkbox").checked;
    var drawUpper = document.getElementById("upper_checkbox").checked;

    // Validate both boxes for domain
    var startValid = validateFloat(startTextbox);
    var endValid = validateFloat(endTextbox);

    if (!startValid || !endValid) {
        return false;
    }
    else {
        var start = parseFloat(startTextbox.value);
        var end = parseFloat(endTextbox.value);

        if (end <= start) {
            // Show an error if end <= start
            addClass(startTextbox, "error");
            addClass(endTextbox, "error");
            return false;
        }
    }

    if (!validateInteger(partitionTextbox)) {
        return false;
    }

    var domain = {"interval": [start, end]};
    var partition = uniformPartition(domain.interval, parseInt(partitionTextbox.value));
    setFunction(exampleFunctions[func], domain, partition, drawLower, drawUpper);
}

// Populate functions dropdown
var dropdown = document.getElementById("functions_dropdown");
for (var func in exampleFunctions) {
    var option = document.createElement("option");
    option.value = func;
    option.innerHTML = func;
    dropdown.appendChild(option);
}

// Update function settings whever one of the options is changed
var inputs = document.querySelectorAll("#functions_dropdown, #domain_start, " +
                                       "#domain_end, #partition_size, " +
                                       "#lower_checkbox, #upper_checkbox");
for (var i=0; i<inputs.length; i++) {
    inputs[i].onchange = updateSettings;
}

updateSettings();
