const maptilerApiKey = "get-your-own"; // get your own
const demUrl = "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N40_00_W075_00_DEM/Copernicus_DSM_COG_10_N40_00_W075_00_DEM.tif"
const tileUrl = `http://localhost:8000/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?url=${demUrl}`;
let min = 0;
let max = 0;

function initMap() {
    var map = window.map = new maplibregl.Map({
        container: "map",
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerApiKey}`, // style URL
        center: [-74.50013888888888, 40.50013888888889],
        zoom: 8
    });


    map.once("load", function () {

        map.addSource('titiler-source', {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            "bounds": [
                -75.00013888888888,
                40.00013888888889,
                -74.00013888888888,
                41.00013888888889
            ],
        });
        map.addLayer({
            "id": 'titiler-layer',
            "type": 'raster',
            "source": "titiler-source",
            "paint": {
                'raster-opacity': 1
            },
            "layout": {
                "visibility": "visible"
            },
        })

        var gui = window.gui = new dat.GUI();

        const opacity = gui.add(guiParams, "opacity", 0, 1);
        const scale = gui.add(guiParams, "rasterColor", Object.keys(colorScales).map(map => map.toLowerCase()));

        opacity.onChange(opac => {
            map.setPaintProperty("titiler-layer", "raster-opacity", opac);
            document.getElementById("gradient").style.opacity = opac;
        });

        scale.onChange(setColorScale).listen();

        fetch(`http://localhost:8000/cog/statistics?url=${demUrl}`).then(res => res.json()).then(data => {
            console.log(data)
            min = data.b1.min;
            max = data.b1.max;
            const threshold = gui.add(guiParams, "threshold", min, max, 1)
            threshold.onChange(onChangeThreshold).listen()
        })
    });
}

const quantize = (interpolator, opac = x => 1, n = 100) => d3.quantize(interpolator, n).map((c, i) => {
    const col = d3.rgb(c);
    const t = i / (n - 1);
    return [t, `rgba(${col.r},${col.g},${col.b},${col.opacity * opac(t)})`];
});


const colorScales = {
    default: "",
    Viridis: quantize(d3.interpolateViridis),
    Greys: quantize(x => d3.interpolateGreys(1 - x)),
    Turbo: quantize(d3.interpolateTurbo),
    Inferno: quantize(d3.interpolateInferno),
    Magma: quantize(d3.interpolateMagma),
    Plasma: quantize(d3.interpolatePlasma),
    Cividis: quantize(d3.interpolateCividis),
    Cool: quantize(d3.interpolateCool),
    Warm: quantize(d3.interpolateWarm),
    Cubehelix: quantize(d3.interpolateCubehelixDefault),
    RdPu: quantize(x => d3.interpolateRdPu(1 - x)),
    YlGnBu: quantize(x => d3.interpolateYlGnBu(1 - x)),
    Rainbow: quantize(d3.interpolateRainbow),
    Sinebow: quantize(d3.interpolateSinebow),
    RdBu: quantize(d3.interpolateRdBu),
    PopDensity: quantize(d3.interpolateMagma, t => 3 * t * t - 2 * t * t * t),
};
const colormap_name = Object.keys(colorScales);

function GUIParams() {
    this.opacity = 1;
    this.rasterColor = "default";
    this.threshold = 0;
}

const guiParams = new GUIParams();

function setColorScale(scale) {

    if (scale == 'default') {
        map.getSource("titiler-source").setTiles([tileUrl])
        return
    }

    onChangeThreshold()

    const cs = Object.keys(colorScales).find(ele => ele.toLowerCase() == scale);
    document.getElementById("gradient").style.background = `linear-gradient(90deg, ${colorScales[cs].map(([pos, col]) => `${col} ${(pos * 100).toFixed(1)}%`).join(",")})`;
    document.getElementById("gradient").style.opacity = guiParams.opacity;
}

function onChangeThreshold(thresholdValue) {
    setTimeout(() => {
        let algorithmstring = `&algorithm=hyposometry&algorithm_params=${JSON.stringify({ "threshold": guiParams.threshold })}`

        if (guiParams.rasterColor == 'default') {
            let updatedUrl = tileUrl + algorithmstring;
            map.getSource("titiler-source").setTiles([tileUrl])
            return
        }

        let updatedUrl = tileUrl + `&colormap_name=${guiParams.rasterColor}&rescale=${min},${max}` + algorithmstring;
        map.getSource("titiler-source").setTiles([updatedUrl])


    }, 300)
}

initMap()