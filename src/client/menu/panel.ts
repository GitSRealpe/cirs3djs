import { GridStack } from 'gridstack'
var n = 0

export function initMenu() {

    var grid = GridStack.init({
        handle: '.widget-header',
        column: 1,
        cellHeight: 200,
        float: false,
        minRow: 3,
        removable: true
    });

    document.getElementById("addGoal")?.addEventListener("click", function (event) {
        n++
        console.log("adding goal", n)

        grid.addWidget({
            // w: 6,
            // h: 1,
            content: '<div class="widget-header"><button id="' + n + '">x</button></div> \
            <div class= "widget"> '+ n + '</div>'
        });

        document.getElementById(n.toString())?.addEventListener("click", function (event) {
            document.getElementById("menus").getElementsByClassName("grid-stack-element")
            // @ts-ignore
            // grid.removeWidget(document.getElementById("menus").firstChild)
            grid.removeWidget(this.parentElement.parentElement.parentElement)
        })

    })

    grid.addWidget({
        // w: 6,
        // h: 1,
        content: '<div class="widget-header"><button id="1">x</button></div> \
            <div class= "widget"> 1</div>'
    });

    // grid.addWidget({
    //     // w: 2,
    //     content: '<button id="2">x</button><br>2'
    // });



}

