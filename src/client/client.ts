
import * as ROSLIB from 'roslib'
import { initViewer } from './viewer';
import * as ROS3D from './ros3d/ros3d'

import { sayHello } from './hello-world';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module'

import { GridStack } from 'gridstack'

var grid = GridStack.init({
    handle: '.widget-header',
    column: 1,
    cellHeight: 200,
    float: false,
    minRow: 3,
    removable: true
});

grid.addWidget({
    // w: 6,
    // h: 1,
    content: '<div class="widget-header"><button id="1">x</button></div> \
            <div class= "widget"> 1</div>'
});

grid.addWidget({
    // w: 2,
    content: '<button id="2">x</button><br>2'
});

grid.addWidget({
    // w: 2,
    content: '<button id="3">x</button><br>2'
});

grid.addWidget({
    // w: 2,
    content: '<button id="3">x</button><br>2'
});

grid.addWidget({
    // w: 2,
    content: '<button id="3">x</button><br>2'
});

document.getElementById("1")?.addEventListener("click", function (event) {
    console.log("sss")
    console.log(this.parentElement.parentElement.parentElement)
    document.getElementById("menus").getElementsByClassName("grid-stack-element")
    // @ts-ignore
    grid.removeWidget(document.getElementById("menus").firstChild)
    // grid.removeWidget(this.parentElement.parentElement.parentElement)
})



sayHello()

var ros = new ROSLIB.Ros({
    url: 'ws://localhost:9090'
    // url: 'ws://192.168.1.172:9090'
});

// initViewer();

var ancho = document.getElementById("gui")?.getBoundingClientRect().width
var alto = document.getElementById("gui")?.getBoundingClientRect().height
// ancho = 500
// alto = 500

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x210db8);

const camera = new THREE.PerspectiveCamera(
    75,
    ancho / alto,
    0.1,
    1000
)
// camera.position.z = 2
camera.position.set(2, 2, 2)
camera.up.set(0, 0, 1);

// lights
scene.add(new THREE.AmbientLight(0x555555));
var directionalLight = new THREE.DirectionalLight(0xffffff, 0.66);
scene.add(directionalLight);

// grid
const size = 10;
const divisions = 10;
const gridHelper = new THREE.GridHelper(size, divisions);
gridHelper.rotateX(1.57)
scene.add(gridHelper);
// axes helper
const axesHelper = new THREE.AxesHelper(1);
scene.add(axesHelper);

const renderer = new THREE.WebGLRenderer()
renderer.setSize(ancho, alto)
document.getElementById("gui")?.appendChild(renderer.domElement)

new OrbitControls(camera, renderer.domElement)

const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3)
const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
})

const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// Setup a client to listen to TFs.
var tfClient = new ROSLIB.TFClient({
    ros: ros,
    angularThres: 0.01,
    transThres: 0.01,
    rate: 50.0,
    fixedFrame: '/world'
});

var urdfClient = new ROS3D.UrdfClient(
    ros,
    "girona1000/robot_description",
    "/robots/",
    tfClient,
    scene,
    ""
);

var ro = new ResizeObserver(entries => {
    for (let entry of entries) {
        const cr = entry.contentRect;
        camera.aspect = cr.width / cr.height
        camera.updateProjectionMatrix()
        renderer.setSize(cr.width, cr.height)
        render()
    }
});

// Observe one or multiple elements
ro.observe(document.getElementById("gui"));


const stats = new Stats()
// stats.dom.style.position = "fixed"
// document.body.appendChild(stats.dom)
// document.getElementById("pantalla").appendChild(stats.dom)
stats.dom.style.position = "absolute"
stats.dom.style.top = "inherit"
stats.dom.style.left = "inherit"
document.getElementById("gui").prepend(stats.dom)


function animate() {
    requestAnimationFrame(animate)

    cube.rotation.x += 0.01
    cube.rotation.y += 0.01

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()