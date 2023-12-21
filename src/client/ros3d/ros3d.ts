import * as ROSLIB from "roslib";
import * as THREE from "three";
import { MeshResource, MeshLoader } from "./meshloader"


var makeColorMaterial = function (r: number, g: number, b: number, a: number) {
    var color = new THREE.Color();
    color.setRGB(r, g, b);
    if (a <= 0.99) {
        return new THREE.MeshBasicMaterial({
            color: color.getHex(),
            opacity: a + 0.1,
            transparent: true,
            depthWrite: true,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
            blendEquation: THREE.ReverseSubtractEquation,
            blending: THREE.NormalBlending
        });
    } else {
        return new THREE.MeshPhongMaterial({
            color: color.getHex(),
            opacity: a,
            blending: THREE.NormalBlending
        });
    }
};

export class SceneNode extends THREE.Object3D {

    /**
     * A SceneNode can be used to keep track of a 3D object with respect to a ROS frame within a scene.
     *
     * @constructor
     * @param options - object with following keys:
     *
     *  * tfClient - a handle to the TF client
     *  * frameID - the frame ID this object belongs to
     *  * pose (optional) - the pose associated with this object
     *  * object - the THREE 3D object to be rendered
     */

    frameID: string;
    pose: ROSLIB.Pose | null;
    tfClient: ROSLIB.TFClient;
    object: MeshResource;

    constructor(options: { frameID: string, pose: ROSLIB.Pose | null, tfClient: ROSLIB.TFClient, object: MeshResource | THREE.Object3D }) {
        super();
        // options = options ;
        // var this = this;
        this.tfClient = options.tfClient;
        this.frameID = options.frameID;
        this.object = options.object;
        this.pose = options.pose || new ROSLIB.Pose();
        this.object = options.object

        // Do not render this object until we receive a TF update
        this.visible = false;

        // add the model
        this.add(this.object);

        // set the inital pose
        this.updatePose(this.pose);

        // listen for TF updates
        console.log(this.frameID)

        // this.tfClient.subscribe("/girona1000/base_link", this.tfUpdate.bind(this));
        this.tfClient.subscribe(this.frameID, this.tfUpdate.bind(this));
    }

    tfUpdate(msg: ROSLIB.Transform) {
        // apply the transform
        var tf = new ROSLIB.Transform(msg);
        var poseTransformed = new ROSLIB.Pose(this.pose);
        poseTransformed.applyTransform(tf);

        // update the world
        this.updatePose(poseTransformed);
        this.visible = true;

    };

    /**
     * Set the pose of the associated model.
     *
     * @param pose - the pose to update with
     */
    updatePose(pose: ROSLIB.Pose) {
        this.position.set(pose.position.x, pose.position.y, pose.position.z);
        this.quaternion.set(pose.orientation.x, pose.orientation.y,
            pose.orientation.z, pose.orientation.w);
        this.updateMatrixWorld(true);
    };

    unsubscribeTf() {
        this.tfClient.unsubscribe(this.frameID, this.tfUpdate);
    };
}


export class Urdf extends THREE.Object3D {

    /**
     * A URDF can be used to load a ROSLIB.UrdfModel and its associated models into a 3D object.
     *
     * @constructor
     * @param options - object with following keys:
     *
     *   * urdfModel - the ROSLIB.UrdfModel to load
     *   * tfClient - the TF client handle to use
     *   * path (optional) - the base path to the associated Collada models that will be loaded
     *   * tfPrefix (optional) - the TF prefix to used for multi-robots
     *   * loader (optional) - the Collada loader to use (e.g., an instance of ROS3D.COLLADA_LOADER)
     */


    constructor(options: { path: string, tfClient: ROSLIB.TFClient, urdfModel: ROSLIB.UrdfModel, tfPrefix: string }) {
        options = options;
        var urdfModel = options.urdfModel;
        var path = options.path || '/';
        var tfClient = options.tfClient;
        var tfPrefix = options.tfPrefix || '';
        // var loader = options.loader;

        super();

        // load all models
        var links = urdfModel.links;
        for (var l in links) {
            var link = links[l];
            for (var i = 0; i < link.visuals.length; i++) {
                var visual = link.visuals[i];
                if (visual && visual.geometry) {
                    // Save frameID
                    var frameID = tfPrefix + link.name;
                    // Save color material
                    var colorMaterial = null;
                    if (visual.material && visual.material.color) {
                        var color = visual.material && visual.material.color;
                        colorMaterial = makeColorMaterial(color.r, color.g, color.b, color.a);
                    }
                    if (visual.geometry.type === ROSLIB.URDF_MESH) {
                        var uri = visual.geometry.filename;
                        // strips package://
                        var tmpIndex = uri.indexOf('package://');
                        if (tmpIndex !== -1) {
                            uri = uri.substr(tmpIndex + ('package://').length);
                        }
                        var fileType = uri.substr(-3).toLowerCase();
                        // @ts-ignore
                        if (MeshLoader.loaders[fileType]) {
                            // create the model
                            var mesh = new MeshResource({
                                path: path,
                                resource: uri,
                                // loader: loader,
                                material: colorMaterial
                            });

                            // check for a scale
                            // @ts-ignore
                            if (link.visuals[i].geometry.scale) {
                                // @ts-ignore
                                mesh.scale.copy(visual.geometry.scale);
                            }

                            // create a scene node with the model
                            var sceneNode = new SceneNode({
                                frameID: frameID,
                                pose: visual.origin,
                                tfClient: tfClient,
                                object: mesh
                            });
                            // @ts-ignore
                            sceneNode.name = visual.name;
                            this.add(sceneNode);
                        } else {
                            console.warn('Could not load geometry mesh: ' + uri);
                        }
                    } else {
                        var shapeMesh = this.createShapeMesh(visual, options);
                        // Create a scene node with the shape
                        var scene = new SceneNode({
                            frameID: frameID,
                            pose: visual.origin,
                            tfClient: tfClient,
                            // @ts-ignore
                            object: shapeMesh
                        });
                        // @ts-ignore
                        scene.name = visual.name;
                        this.add(scene);
                    }
                }
            }
        }
    };
    // @ts-ignore
    createShapeMesh(visual, options) {
        var colorMaterial = null;
        if (!colorMaterial) {
            colorMaterial = makeColorMaterial(0, 0, 0, 1);
        }
        var shapeMesh;
        // Create a shape
        switch (visual.geometry.type) {
            case ROSLIB.URDF_BOX:
                var dimension = visual.geometry.dimension;
                var cube = new THREE.BoxGeometry(dimension.x, dimension.y, dimension.z);
                shapeMesh = new THREE.Mesh(cube, colorMaterial);
                break;
            case ROSLIB.URDF_CYLINDER:
                var radius = visual.geometry.radius;
                var length = visual.geometry.length;
                var cylinder = new THREE.CylinderGeometry(radius, radius, length, 16, 1, false);
                shapeMesh = new THREE.Mesh(cylinder, colorMaterial);
                shapeMesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.5);
                break;
            case ROSLIB.URDF_SPHERE:
                var sphere = new THREE.SphereGeometry(visual.geometry.radius, 16);
                shapeMesh = new THREE.Mesh(sphere, colorMaterial);
                break;
        }

        return shapeMesh;
    };


    // unsubscribeTf() {

    //     this.children.forEach(function (n) {
    //         // @ts-ignore
    //         if (typeof n.unsubscribeTf === 'function') { n.unsubscribeTf(); }
    //     });
    // };
}

export class UrdfClient {

    /**
     * A URDF client can be used to load a URDF and its associated models into a 3D object from the ROS
     * parameter server.
     *
     * Emits the following events:
     *
     * * 'change' - emited after the URDF and its meshes have been loaded into the root object
     *
     * @constructor
     * @param {ROSLIB.Ros} ros - object with following keys:
     *
     *   * ros - the ROSLIB.Ros connection handle
     *   * param (optional) - the paramter to load the URDF from, like 'robot_description'
     *   * tfClient - the TF client handle to use
     *   * path (optional) - the base path to the associated Collada models that will be loaded
     *   * rootObject (optional) - the root object to add this marker to
     *   * tfPrefix (optional) - the TF prefix to used for multi-robots
     *   * loader (optional) - the Collada loader to use (e.g., an instance of ROS3D.COLLADA_LOADER)
     */

    ros: ROSLIB.Ros;
    param: string;
    path: string;
    tfClient: ROSLIB.TFClient;
    rootObject: THREE.Object3D;
    tfPrefix: string;
    urdf: Urdf | undefined;

    constructor(ros: ROSLIB.Ros, param: string, path: string, tfClient: ROSLIB.TFClient, rootObject: THREE.Object3D, tfPrefix: string) {
        this.ros = ros;
        this.param = param;
        this.path = path;
        this.tfClient = tfClient;
        this.rootObject = rootObject;
        this.tfPrefix = tfPrefix || "/"

        this.getParam()
    }

    getParam() {
        // try to get the robot description param
        var getParam = new ROSLIB.Param({
            ros: this.ros,
            name: this.param
        });
        getParam.get((string) => {
            // hand off the XML string to the URDF model
            var urdfModel = new ROSLIB.UrdfModel({
                string: string
            });

            console.log(urdfModel)

            // load all models
            this.urdf = new Urdf({
                urdfModel: urdfModel,
                path: this.path,
                tfClient: this.tfClient,
                tfPrefix: this.tfPrefix,
                // loader: that.loader
            });
            this.rootObject.add(this.urdf);
            console.log(this.urdf)
        })



    }

    // constructor(options: {
    //     ros: ROSLIB.Ros;
    //     param?: string | undefined;
    //     path?: string | undefined;
    //     tfClient?: ROSLIB.TFClient;
    //     rootObject?: THREE.Object3D;
    //     tfPrefix: string | undefined;
    //     loader?: string | undefined;
    // });



    // get the URDF value from ROS
    //     var getParam = new ROSLIB.Param({
    //         ros: ros,
    //         name: this.param
    //     });
    // getParam.get(function (string) {
    //     // hand off the XML string to the URDF model
    //     var urdfModel = new ROSLIB.UrdfModel({
    //         string: string
    //     });

    //     // load all models
    //     that.urdf = new Urdf({
    //         urdfModel: urdfModel,
    //         path: that.path,
    //         tfClient: that.tfClient,
    //         tfPrefix: that.tfPrefix,
    //         loader: that.loader
    //     });
    //     that.rootObject.add(that.urdf);
}
