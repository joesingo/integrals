var settings = {
    "delta": 0.01,

    "grid": {
        "on": true,
        "ticks": [1, 5],
        "lineWidths": [0.5, 1],
        "colours": ["#777", "#555"]
    },

    "axis": {
        "on": true,
        "colour": "black",
        "lineWidth": 3
    },

    "size": {
        "x": 900,
        "y": 600
    },

    "graph": {
        "lineWidth": 2,
        "colour": "black"
    },

    "scale": {
        "x": 70,
        "y": -70
        // y scale is always negative because we want up to be the
        // positive y direction, but for canvas coordinates it's the
        // other way around
    },

    "minScale": 10,
    "zoomFactor": 0.08, // The lower this number the slower zooming in is

    "sums": {
        "upper": true,
        "lower": true,
        "opacity": 0.8,
        "borderColour": "black",
        "borderWidth": 3,
        "upperColour": "#C22326",
        "lowerColour": "#027878",
        "font": "15px Arial",
        "fontColour": "blue"
    },

    "border": {
        "on": true,
        "width": 5,
        "colour": "black"
    }
}

var exampleFunctions = {
    "sin(x)": function(x) {return Math.sin(x);},
    "x^3": function(x) {return 0.2*x*x*x;},
    "exp(-x^2)": function(x) {return 3*Math.exp(-x*x);},
    "|x|": function(x) {return Math.abs(x);},
    "1 / x": function(x) {return (x == 0 ? 1000 : (1 / x));},
    "sin(x) / x": function(x) {return (x == 0 ? 1 : (10 * Math.sin(x) / x));}
};

function draw() {
    clearCanvas();

    if (settings.border.on) {
        ctx.strokeStyle = settings.border.colour;
        ctx.lineWidth = settings.border.width;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    if (settings.grid.on) {
        for (var i=0; i<settings.grid.ticks.length; i++) {
            drawGrid(
                settings.grid.ticks[i],
                settings.grid.lineWidths[i],
                settings.grid.colours[i]
            );
        }
    }
    drawSums(settings.f, settings.partition);
    drawGraph(settings.f);

    if (settings.axis.on) {
        drawAxis();
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getMouseCoords(e, canvas) {
    // Get the coordinates of the mouse event within the canvas
    return [e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop];
}

function toggleSums(type) {
    settings.sums[type] = settings.sums[type] ? false : true;
    draw();
}

function addClass(element, className) {
    // Add the specified class to the given element
    var classes = element.className.split(" ");
    if (classes.indexOf(className) === -1) {
        classes.push(className);
    }
    element.className = classes.join(" ");
}

function removeClass(element, className) {
    // Remove the specified class from the given element
    var classes = element.className.split(" ");
    var index = classes.indexOf(className);
    if (index !== -1) {
        classes.splice(index, 1);
    }
    element.className = classes.join(" ");
}

function validateFloat(textbox) {
    // Check if the contents of the textbox is an float; return true
    // if so or show an error and return false if not
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

function validateInteger(textbox) {
    // Like validateFloat() above, but check for an integer value
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

function setFunction(func, domain, partition) {
    settings.f = func;
    settings.f.domain = domain;
    settings.f.points = calculatePoints(func);
    settings.anchor = [(domain[0] + domain[1]) / 2, 0];
    settings.partition = partition;
}

function updateFunction() {
    // Update the function, domain and partition when user changes it
    var startTextbox = document.getElementById("domain_start");
    var endTextbox = document.getElementById("domain_end");
    var partitionTextbox = document.getElementById("partition_size");
    var func = document.getElementById("functions_dropdown").value;

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

    var domain = [start, end];
    var partition = uniformPartition(domain, parseInt(partitionTextbox.value));

    setFunction(exampleFunctions[func], [start, end], partition);
    draw();
}

function calculatePoints(f) {
    // Return an array of [x,f(x)] for x in domain of f at intervals of
    // settings.delta.
    var points = [];
    for (var x=f.domain[0]; x<=f.domain[1]; x+=settings.delta) {
        points.push([x, f(x)]);
    }
    return points;
}

function uniformPartition(interval, n) {
    // Return a partition of the given interval with n sub-intervals of
    // equal width
    var p = [];
    var width = (interval[1] - interval[0]) / n;
    for (var i=0; i<=n; i++) {
        p.push(interval[0] + i*width);
    }
    return p;
}

function getCanvasCoord(t, axis) {
    // Get canvas coordinate from real coordinate.
    // (If making changes here be sure to also update getRealCoord())
    var i = (axis === "x" ? 0 : 1);
    return 0.5*settings.size[axis] + settings.scale[axis]*(t - settings.anchor[i]);
}

function getRealCoord(T, axis) {
    // Get the real coordinate from a canvas coordinate (inverse of
    // getCanvasCoord())
    var i = (axis === "x" ? 0 : 1);
    return settings.anchor[i] + (T - 0.5*settings.size[axis]) / settings.scale[axis];
}

function drawGraph(f) {
    ctx.strokeStyle = settings.graph.colour;
    ctx.lineWidth = settings.graph.lineWidth;
    ctx.beginPath();
    for (var i=0; i<f.points.length; i++) {
        var canvasX = getCanvasCoord(f.points[i][0], "x");
        var canvasY = getCanvasCoord(f.points[i][1], "y");

        ctx.lineTo(canvasX, canvasY);
    }
    ctx.stroke();
}

function round(x, n) {
    // Round x to the nearest n
    return Math.round(x / n) * n;
}

function drawGrid(frequency, thickness, colour) {
    var startX = round(getRealCoord(0, "x"), frequency);
    var endY = round(getRealCoord(canvas.width, "x"), frequency);

    ctx.strokeStyle = colour;
    ctx.lineWidth = thickness;

    // Draw vertical lines
    for (var x=startX; x<=endY; x+=frequency) {
        ctx.beginPath();
        var canvasX = getCanvasCoord(x, "x");

        ctx.moveTo(canvasX, 0);
        ctx.lineTo(canvasX, canvas.height);
        ctx.stroke();
    }

    var startY = round(getRealCoord(canvas.height, "y"), frequency);
    var endY = round(getRealCoord(0, "y"), frequency);

    // Draw horizontal lines
    for (var y=startY; y<=endY; y+=frequency) {
        ctx.beginPath();
        var canvasY = getCanvasCoord(y, "y");

        ctx.moveTo(0, canvasY);
        ctx.lineTo(canvas.width, canvasY);
        ctx.stroke();
    }
}

function drawAxis() {
    ctx.strokeStyle = settings.axis.colour;
    ctx.lineWidth = settings.axis.lineWidth;
    ctx.beginPath();
    var y = getCanvasCoord(0, "y");
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
}

function drawSums(f, p) {
    // Draw and estimate an upper/lower sum for the function f and
    // partition p

    var upper = 0;
    var lower = 0;

    ctx.globalAlpha = settings.sums.opacity;

    for (i=1; i<p.length; i++) {
        // // Endpoints of this sub-interval
        var start = p[i - 1];
        var end = p[i];

        // Get min/max value of f
        var minY = null;
        var maxY = null;

        for (var j=0; j<f.points.length; j++) {
            var x = f.points[j][0];
            var y = f.points[j][1];

            if (start <= x && x <= end) {
                // Set min/max if this is the first time;
                if (minY === null) {
                    minY = y;
                    maxY = y;
                }

                if (y < minY) {
                    minY = y;
                }
                if (y > maxY) {
                    maxY = y;
                }
            }
        }

        // Add to the estimates
        upper += maxY * (end - start);
        lower += minY * (end - start);

        // Colours and heights of rectangles
        var r = [];
        if (settings.sums.upper) {
            r.push([maxY, settings.sums.upperColour]);
        }
        if (settings.sums.lower) {
            r.push([minY, settings.sums.lowerColour]);
        }

        // If both max and min are positive then we want to draw upper
        // sums first, since they will fully cover lower sums otherwise.
        // However if max and min are both negative then lower sums
        // should be drawn first
        if (minY < 0 && maxY < 0) {
            r.reverse();
        }

        for (var j=0; j<r.length; j++) {
            ctx.strokeStyle = settings.sums.borderColour;
            ctx.lineWidth = settings.sums.borderWidth;
            ctx.fillStyle = r[j][1];
            ctx.strokeRect(
                getCanvasCoord(start, "x"), getCanvasCoord(0, "y"),
                settings.scale.x*(end - start), settings.scale.y*r[j][0]
            );
            ctx.fillRect(
                getCanvasCoord(start, "x"), getCanvasCoord(0, "y"),
                settings.scale.x*(end - start), settings.scale.y*r[j][0]
            );

        }
    }

    // Show estimates for upper and lower sum
    var padding = 10;
    var squareSize = 30;

    ctx.font = settings.sums.font;
    ctx.fillStyle = settings.sums.fontColour;
    ctx.textBaseline = "middle";

    // Put this stuff in an array so we can loop through it
    var a = [
        [settings.sums.lowerColour, lower],
        [settings.sums.upperColour, upper],
    ];

    for (var i=0; i<a.length; i++) {
        // Round to 4dp and display in top corner
        var text = "≈ " + a[i][1];

        ctx.fillStyle = a[i][0];
        ctx.fillRect(padding, (i+1)*padding + i*squareSize, squareSize, squareSize);
        ctx.fillText(text, 2*padding + squareSize, (i+1)*padding + (0.5+i)*squareSize);
    }


    ctx.globalAlpha = 1;
}

function resizeCanvas() {
    canvas.width = settings.size.x;
    canvas.height = settings.size.y;

    draw();
}

var canvas = document.getElementById("main_canvas");
var ctx = canvas.getContext("2d");

// Pan when dragged
var mouseDown = false;
var dragPoint = null;
canvas.addEventListener("mousedown", function(e) {
    dragPoint = getMouseCoords(e, canvas);
    mouseDown = true;
});
canvas.addEventListener("mousemove", function(e) {
    if (mouseDown) {
        // Adjust anchor to achieve panning
        var mouseCoords = getMouseCoords(e, canvas);
        settings.anchor[0] += (dragPoint[0] - mouseCoords[0]) / settings.scale.x;
        settings.anchor[1] += (dragPoint[1] - mouseCoords[1]) / settings.scale.y;

        draw();

        dragPoint = mouseCoords;
    }
});
canvas.addEventListener("mouseup", function(e) {
    mouseDown = false;
});
canvas.addEventListener("mouseleave", function(e) {
    // For some reason if you have mouse down over canvas and then move
    // mouse off screen/off the canvas, release the mouse, return to
    // canvas, mouseup event is not fired... So need to set mouseDown
    // to false here
    mouseDown = false;
});

// Zoom when scrolling
canvas.addEventListener("mousewheel", function(e) {
    // Stop whole page scrolling
    e.preventDefault();

    var mouseCoords = getMouseCoords(e, canvas);

    // Keep a copy of the original scale
    var origScale = [settings.scale.x, settings.scale.y]

    var d = settings.zoomFactor * e.wheelDelta;
    settings.scale.x += d;
    settings.scale.y -= d;

    // Make sure we're not zoomed too far out
    if (settings.scale.x <= settings.minScale) {
        settings.scale.x = settings.minScale;
    }
    // We have - here because y scale should always be negative
    if (-settings.scale.y <= settings.minScale) {
        settings.scale.y = -settings.minScale;
    }

    // Now need to adjust anchor so we have zoomed into the right part
    // of the graph
    settings.anchor[0] -= (mouseCoords[0] - 0.5*settings.size.x)*((1 / settings.scale.x) - (1 / origScale[0]));
    settings.anchor[1] -= (mouseCoords[1] - 0.5*settings.size.y)*((1 / settings.scale.y) - (1 / origScale[1]));

    for (var i=0; i<settings.grid.ticks.length; i++) {
        // settings.grid.ticks[i] /= 0.9;
    }

    draw();
});

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
                                       "#domain_end, #partition_size");
for (var i=0; i<inputs.length; i++) {
    inputs[i].onchange = updateFunction;
}

updateFunction();

resizeCanvas();

function animate() {
    var k = 1;
    setInterval(function() {
        settings.partition = uniformPartition(settings.f.domain, k++);
        draw();
    }, 250)
}

function c(s) {
    // To save typing when debugging
    console.log(s);
}
