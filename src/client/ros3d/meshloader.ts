// @ts-nocheck
import * as THREE from "three";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader'
import * as ROSLIB from 'roslib'

export class MeshResource extends THREE.Object3D {

    /**
     * A MeshResource is an THREE object that will load from a external mesh file. Currently loads
     * Collada files.
     *
     * @constructor
     * @param options - object with following keys:
     *
     *  * path (optional) - the base path to the associated models that will be loaded
     *  * resource - the resource file name to load
     *  * material (optional) - the material to use for the object
     *  * warnings (optional) - if warnings should be printed
     */
    constructor(options) {
        super();
        options = options || {};
        var path = options.path || '/';
        var resource = options.resource;
        options.material || null;
        this.warnings = options.warnings;


        // check for a trailing '/'
        if (path.substr(path.length - 1) !== '/') {
            path += '/';
        }

        var uri = path + resource;
        var fileType = uri.substr(-3).toLowerCase();

        // check the type
        var loaderFunc = MeshLoader.loaders[fileType];
        if (loaderFunc) {
            loaderFunc(this, uri, options);
        } else {
            console.warn('Unsupported loader for file type: \'' + fileType + '\'');
        }
    };
}

var MeshLoader = {
    onError: function (error) {
        console.error(error);
    },
    loaders: {
        'dae': function (meshRes, uri, options) {
            const material = options.material;
            const loader = new ColladaLoader(options.loader);
            loader.log = function (message) {
                if (meshRes.warnings) {
                    console.warn(message);
                }
            };
            loader.load(
                uri,
                function colladaReady(collada) {
                    // check for a scale factor in ColladaLoader2
                    // add a texture to anything that is missing one
                    if (material !== null) {
                        collada.scene.traverse(function (child) {
                            if (child instanceof THREE.Mesh) {
                                if (child.material === undefined) {
                                    child.material = material;
                                }
                            }
                        });
                    }

                    meshRes.add(collada.scene);
                },
	         /*onProgress=*/null,
                MeshLoader.onError);
            return loader;
        },

        'obj': function (meshRes, uri, options) {
            options.material;
            const loader = new OBJLoader(options.loader);
            loader.log = function (message) {
                if (meshRes.warnings) {
                    console.warn(message);
                }
            };

            //Reload the mesh again after materials have been loaded
            // @todo: this should be improved so that the file doesn't need to be
            // reloaded however that would involve more changes within the OBJLoader.
            function onMaterialsLoaded(loader, materials) {
                loader.
                    setMaterials(materials).
                    load(
                        uri,
                        function OBJMaterialsReady(obj) {
                            // add the container group
                            meshRes.add(obj);
                        },
                        null,
                        MeshLoader.onError);
            }

            loader.load(
                uri,
                function OBJFileReady(obj) {

                    const baseUri = THREE.LoaderUtils.extractUrlBase(uri);

                    if (obj.materialLibraries.length) {
                        // load the material libraries
                        const materialUri = obj.materialLibraries[0];
                        new MTLLoader(options.loader).setPath(baseUri).load(
                            materialUri,
                            function (materials) {
                                materials.preload();
                                onMaterialsLoaded(loader, materials);
                            },
                            null,
                            MeshLoader.onError
                        );
                    } else {
                        // add the container group
                        meshRes.add(obj);
                    }

                },
	         /*onProgress=*/null,
                MeshLoader.onError
            );
            return loader;
        },

        'stl': function (meshRes, uri, options) {
            const material = options.material;
            const loader = new STLLoader(options.loader);
            {
                loader.load(uri,
                    function (geometry) {
                        geometry.computeFaceNormals();
                        var mesh;
                        if (material !== null) {
                            mesh = new THREE.Mesh(geometry, material);
                        } else {
                            mesh = new THREE.Mesh(geometry,
                                new THREE.MeshBasicMaterial({ color: 0x999999 }));
                        }
                        meshRes.add(mesh);
                    },
	                     /*onProgress=*/null,
                    MeshLoader.onError);
            }
            return loader;
        }

    }
};

export { MeshLoader }