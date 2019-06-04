import React from 'react';
import PropTypes from 'prop-types';
import * as PIXI from 'pixi.js-legacy';
import {getSystemTheta, getSystemPhi} from './utils';

const convertPhase = function(phase) {
    return (phase % 1 + 1) % 1;
};

export default class BinarySystemView extends React.Component {
    constructor(props) {
        super(props);
        this.id = 'BinarySystemView';

        this._c = {};

        this.orbitalPlane = null;

        this.initObject = {
            phase: 0.4,
            mass1: 2,
            mass2: 1.9,
            radius1: 1.5,
            radius2: 1.4,
            phi: getSystemPhi(this.props.inclination),
            theta: getSystemTheta(this.props.longitude),
            showOrbitalPlane: true,
            showOrbitalPaths: true,
            autoScale: true,
            targetSize: 470,
            linePhi: 5,
            lineTheta: 135,
            showLine: true,
            lineExtra: 10
        };

        this.orbitalPathStyle = {
            thickness: 1,
            color: 0xffffff,
            alpha: 0.7
        };
        this.gridFillStyle = {
            color: 0x0b0b0b,
            alpha: 0.4
        };
        this.gridLineStyle = {
            thickness: 0,
            color: 0x909090
        };
        this.axisGridLineStyle = {
            thickness: 1, color: 0x4DA94D, alpha: 0.65
        };
        this.minGridLineAlpha = 5;
        this.maxGridLineAlpha = 50;
        this.minGridSpacing = 20;
        this.objectEquatorStyle = {
            thickness: 1, color: 0xb0b0b0, alpha: 0.8
        };
        this.lineThickness = 2;
        this.lineColor = 0xff8080;
    }
    doA() {
        // a0 through a8 are constants used to transform a world
        // coordinate to a screen coordinate
        var c = this._c;
        var ct = Math.cos(this._theta);
        var st = Math.sin(this._theta);
        var cp = Math.cos(this._phi);
        var sp = Math.sin(this._phi);
        var s = this._scale;
        c.a0 = -s * st;
        c.a1 = s * ct;
        c.a3 = s * ct * sp;
        c.a4 = s * st * sp;
        c.a5 = -s * cp;
        c.a6 = s * ct * cp;
        c.a7 = s * st * cp;
        c.a8 = s * sp;
    }
    updateLine() {
        if (!this._showLine) return;

        var lineTheta = this._lineTheta*(Math.PI/180);
        var linePhi = this._linePhi*(Math.PI/180);
        var lineLength = (this._lineExtra + this._targetSize/2)/(this._scale);

        /*let mcA, mcB, mcC;

        if (linePhi==0 || (linePhi>0 && this._phi>0) || (linePhi<0 && this._phi<=0)) {
            mcA = 0;
            mcB = 0;
            mcC = 0;
        } else {
            mcA = 0;
            mcB = 0;
            mcC = 0;
        }*/

        var k1 = -Math.sin(lineTheta);
        var k4 = Math.cos(lineTheta);
        var k6 = Math.sin(linePhi);
        var k0 = k4*Math.cos(linePhi);
        var k3 = -k1*Math.cos(linePhi);

        var x = lineLength*k0;
        var y = lineLength*k3;
        var z = lineLength*k6;

        var c = this._c;

        var xe = x*c.a0 + y*c.a1;
        var ye = x*c.a3 + y*c.a4 + z*c.a5;
        var ze = x*c.a6 + y*c.a7 + z*c.a8;

        var r1 = this.props.star1Radius*this._scale;
        var r2 = this.props.star2Radius*this._scale;

        var x1 = this._s1.x;
        var y1 = this._s1.y;
        var z1 = this._s1.z;

        var x2 = this._s2.x;
        var y2 = this._s2.y;
        var z2 = this._s2.z;

        let xf, yf, zf, xb, yb, zb, rf2, rb2;

        if (z1 > z2) {
            xf = x1;
            yf = y1;
            zf = z1;
            xb = x2;
            yb = y2;
            zb = z2;
            rf2 = r1 * r1;
            rb2 = r2 * r2;
        } else {
            xf = x2;
            yf = y2;
            zf = z2;
            xb = x1;
            yb = y1;
            zb = z1;
            rf2 = r2 * r2;
            rb2 = r1 * r1;
        }

        var sqrt = Math.sqrt;
        //var pow = Math.pow;

        /*function getRegion(u) {
            var mx = u*xe;
            var my = u*ye;
            var mz = u*ze;
            if ((pow(mx-xf,2) + pow(my-yf,2) + pow(mz-zf,2)) < rf2) return null;
            else if ((pow(mx-xb,2) + pow(my-yb,2) + pow(mz-zb,2)) < rb2) return null;
            else if (mz>=zf) return mcA;
            else if (mz>=zb) return mcB;
            else return mcC;
        }*/

        var uArr = [0, 1];

        var a = xe*xe + ye*ye + ze*ze;
        var bf = -2*(xe*xf + ye*yf + ze*zf);
        var cf = xf*xf + yf*yf + zf*zf - rf2;
        var bb = -2*(xe*xb + ye*yb + ze*zb);
        var cb = xb*xb + yb*yb + zb*zb - rb2;

        var df = bf*bf - 4*a*cf;
        var db = bb*bb - 4*a*cb;

        if (df>0) {
            uArr.push((-bf + sqrt(df))/(2*a));
            uArr.push((-bf - sqrt(df))/(2*a));
        }
        if (db>0) {
            uArr.push((-bb + sqrt(db))/(2*a));
            uArr.push((-bb - sqrt(db))/(2*a));
        }
        if (ze!=0) {
            uArr.push(zf/ze);
            uArr.push(zb/ze);
        }

        function sortArr(a, b) {
            if (a<b) return -1;
            else if (a>b) return 1;
            else return 0;
        }

        uArr.sort(sortArr);

        var ux = 0;
        var uy = 0;
        var lu = 0;
        var nu = uArr[0];
        const coords = [];

        for (var i=0; uArr[i]!=1 && i<uArr.length; i++) {
            lu = nu;
            nu = uArr[i+1];
            if (lu<0) continue;
            //var mc = getRegion(lu + ((nu-lu)/2));
            coords.push([ux, uy]);
            ux = nu*xe;
            uy = nu*ye;
            coords.push([ux, uy]);
        }

        // draw arrow head
        var arrowX = ((this._lineExtra + this._targetSize/2) - (2/3)*this._lineExtra)/(this._scale);
        var arrowY1 = (1/4)*this._lineExtra/this._scale;
        var arrowY2 = -arrowY1;
        var a1x = k0*arrowX + k1*arrowY1;
        var a1y = k3*arrowX + k4*arrowY1;
        var a2x = k0*arrowX + k1*arrowY2;
        var a2y = k3*arrowX + k4*arrowY2;
        var az = k6*arrowX;
        x1 = a1x*c.a0 + a1y*c.a1;
        y1 = a1x*c.a3 + a1y*c.a4 + az*c.a5;
        z1 = a1x*c.a6 + a1y*c.a7 + az*c.a8;
        x2 = a2x*c.a0 + a2y*c.a1;
        y2 = a2x*c.a3 + a2y*c.a4 + az*c.a5;
        z2 = a2x*c.a6 + a2y*c.a7 + az*c.a8;
        //var mc = getRegion(1);
        coords.push([x1, y1]);
        coords.push([xe, ye]);
        coords.push([x2, y2]);
        return coords;
    }
    initialize(initObject) {
        // - this function offers a way to set the value of many properties at once without redundant
        //   secondary function calls
        // - no checking is performed to guarantee that the objects do not physically overlap at perigee so
        //   this function is appropriate only for situations in which the parameters are known to be valid

        if (initObject.autoScale!=undefined) this._autoScale = Boolean(initObject.autoScale);
        if (initObject.targetSize!=undefined) this._targetSize = initObject.targetSize;
        if (initObject.showOrbitalPaths!=undefined) this._showOrbitalPaths = Boolean(initObject.showOrbitalPaths);
        if (initObject.showOrbitalPlane!=undefined) this._showOrbitalPlane = Boolean(initObject.showOrbitalPlane);
        if (initObject.phi!=undefined && !(initObject.phi<-90 || initObject.phi>90)) {
            this._phi = initObject.phi*(Math.PI/180);
        }
        if (initObject.theta!=undefined) this._theta = initObject.theta*(Math.PI/180);
        if (initObject.scale!=undefined) this._scale = initObject.scale;
        if (initObject.linePhi!=undefined) this._linePhi = initObject.linePhi;
        if (initObject.lineTheta!=undefined) this._lineTheta = initObject.lineTheta;
        if (initObject.showLine!=undefined) this._showLine = Boolean(initObject.showLine);
        if (initObject.lineExtra!=undefined) this._lineExtra = initObject.lineExtra;

        this._massTotal = this.props.star1Mass + this.props.star2Mass;

        this._a1 = this.props.separation * this.props.star2Mass / this._massTotal;
        this._a2 = this.props.separation * this.props.star1Mass / this._massTotal;

        if (this._autoScale) {
            this.rescale();
        } else {
            this.doA();
            this.resizeIcon(1);
            this.resizeIcon(2);
            this.updateMask(1);
            this.updateMask(2);
            this.updateOrbitalPaths();
            this.updateOrbitalPlane();
            this.updatePositions();
            this.updateLine();
        }
    }
    rescale() {
        // rescale so that the maximum possible radius of the system is the targetSize
        const h = Math.max(
            this._a1*(1+this.props.eccentricity) + this.props.star1Radius,
            this._a2*(1+this.props.eccentricity) + this.props.star2Radius);
        this.setScale(this._targetSize / (2 * h));
    }
    setScale(arg) {
        this._scale = arg;
        this.doA();
        this.resizeIcon(1);
        this.resizeIcon(2);
        this.updateMask(1);
        this.updateMask(2);
        this.updateOrbitalPaths();
        this.updateOrbitalPlane();
        this.updatePositions();
        this.updateLine();
    }
    resizeIcon() {
        // resize the icon of the given body (where arg = 1 or 2)
        /*const bmc = this.backHalfMC["body" + arg + "MC"].iconMC;
        const fmc = this.frontHalfMC["body" + arg + "MC"].iconMC;
        const scalingFactor =
            100 * this._scale * this["_radius" + arg] / this["_icon" + arg + "Radius"];
        bmc._xscale = bmc._yscale = fmc._xscale = fmc._yscale = scalingFactor;*/
    }

    updateMask() {
        // update the mask of the given body (arg = 1 or 2) that's located in the front half movieclip
        // (update the object equator at the same time)

        //var mc = this.frontHalfMC["mask"+arg+"MC"];
        //var aRad = this._scale*this["_radius"+arg];
        var aRad = this._scale * 1;

        var cos = Math.cos;
        var sin = Math.sin;

        var n = 12;
        var hn = n/2;
        var step = (2*Math.PI)/n;

        var cRad = aRad/cos(step/2);

        var aAngle = 0;
        var cAngle = -step/2;

        //mc.moveTo(aRad * cos(aAngle), -aRad * sin(aAngle));
        //mc.beginFill(0xFF0000, 100);

        let ak, ck;
        if (this._phi>0) {
            ak = -aRad;
            ck = -cRad;
        }
        else {
            ak = aRad;
            ck = cRad;
        }

        const coords = [];

        let i;
        for (i = 0; i<hn; i++) {
            aAngle += step;
            cAngle += step;
            coords.push([
                cRad*cos(cAngle),
                ck*sin(cAngle),
                aRad*cos(aAngle),
                ak*sin(aAngle)
            ]);
        }

        ak = -aRad*sin(this._phi);
        ck = -cRad*sin(this._phi);

        // do the equator as we finish drawing the mask
        //var equatorMC = this.frontHalfMC["body"+arg+"MC"].objectEquatorMC;

        /*equatorMC.lineStyle(
            this.objectEquatorStyle.thickness,
            this.objectEquatorStyle.color,
            this.objectEquatorStyle.alpha);*/
        coords.push([-aRad, 0]);

        for (i = hn; i < n; i++) {
            aAngle += step;
            cAngle += step;
            var cx = cRad*cos(cAngle);
            var cy = ck*sin(cAngle);
            var ax = aRad*cos(aAngle);
            var ay = ak*sin(aAngle);
            coords.push([cx, cy, ax, ay]);
            //equatorMC.curveTo(cx, cy, ax, ay);
        }

        //mc.endFill();
    }

    updateOrbitalPaths() {
        const cos = Math.cos;
        const sin = Math.sin;

        this.orbitalPlane.scale.y = 100 * sin(this._phi);
        this.orbitalPlane.rotation = 90 + this._theta * (180 / Math.PI);

        const path1 = this.orbitalPlane.getChildByName('path1');
        const path2 = this.orbitalPlane.getChildByName('path2');

        path1.clear();
        path2.clear();

        if (!this._showOrbitalPaths) return;

        path1.lineStyle(
            this.orbitalPathStyle.thickness,
            this.orbitalPathStyle.color,
            this.orbitalPathStyle.alpha);
        path2.lineStyle(
            this.orbitalPathStyle.thickness,
            this.orbitalPathStyle.color,
            this.orbitalPathStyle.alpha);

        let s = this._scale;
        let e = this.props.eccentricity;

        let n = 12;
        let step = (2 * Math.PI) / n;

        let a1 = this._a1;
        let a2 = this._a2;

        let k = Math.sqrt(1 - e * e);
        let b1 = a1*k;
        let b2 = a2*k;

        let aa1 = s*a1;
        let ab1 = s*b1;
        let aa2 = s*a2;
        let ab2 = s*b2;

        k = 1/cos(step/2);
        let ca1 = aa1*k;
        let cb1 = ab1*k;
        let ca2 = aa2*k;
        let cb2 = ab2*k;

        let dx1 = aa1*e;
        let dx2 = -aa2*e;

        let aAngle = 0;
        let cAngle = -step/2;

        let ax1 = aa1*cos(aAngle) + dx1;
        let ay1 = ab1*sin(aAngle);

        let ax2 = aa2*cos(aAngle) + dx2;
        let ay2 = ab2*sin(aAngle);

        let ccA, scA, caA, saA;

        path1.moveTo(ax1, ay1);
        path2.moveTo(ax2, ay2);

        for (let i=0; i<n; i++) {
            aAngle += step;
            cAngle += step;
            ccA = cos(cAngle);
            scA = sin(cAngle);
            caA = cos(aAngle);
            saA = sin(aAngle);
            path1.quadraticCurveTo(ca1*ccA+dx1, cb1*scA, aa1*caA+dx1, ab1*saA);
            path2.quadraticCurveTo(ca2*ccA+dx2, cb2*scA, aa2*caA+dx2, ab2*saA);
        }
    }

    updateOrbitalPlane() {
        const grid = this.orbitalPlane.getChildByName('grid');

        grid.clear();

        if (!this._showOrbitalPlane) return;

        let ceil = Math.ceil;

        let s = this._scale;
        let e = this.props.eccentricity;
        let a1 = this._a1;
        let a2 = this._a2;
        let k = Math.sqrt(1-e*e);
        let b1 = a1*k;
        let b2 = a2*k;
        let r1 = this.props.star1Radius;
        let r2 = this.props.star2Radius;

        let leftFillExtent = -(Math.max(a2*(1+e) + 1.75*r2, a1*(1-e) + 1.75*r1));
        let rightFillExtent = Math.max(a1*(1+e) + 1.75*r1, a2*(1-e) + 1.75*r2);
        let topFillExtent = Math.max(b1 + 1.75*r1, b2 + 1.75*r2);
        let bottomFillExtent = -topFillExtent;

        let leftX = s*leftFillExtent;
        let rightX = s*rightFillExtent;
        let topY = s*topFillExtent;
        let bottomY = s*bottomFillExtent;

        grid.moveTo(leftX, bottomY);
        grid.lineStyle(1, 0xFF0000, 0);
        grid.beginFill(this.gridFillStyle.color, this.gridFillStyle.alpha);
        grid.lineTo(leftX, topY);
        grid.lineTo(rightX, topY);
        grid.lineTo(rightX, bottomY);
        grid.lineTo(leftX, bottomY);
        grid.endFill();

        let m = this.minGridSpacing/s;
        let lg = Math.log(m)/Math.LN10;
        k = ceil(lg);

        let belowSpacing;
        let spacing;
        let majorMultiple;
        if ((k-lg) > (Math.log(2) / Math.LN10)) {
            // use 5*10^(k-1) as the spacing
            belowSpacing = Math.pow(10, k-1);
            spacing = 5*belowSpacing;
            majorMultiple = 2;
        } else {
            // use 10^k as the spacing
            spacing = Math.pow(10, k);
            belowSpacing = 0.5*spacing;
            majorMultiple = 5;
        }

        let leftGridExtent = ceil(leftFillExtent/spacing);
        let rightGridLimit = ceil(rightFillExtent/spacing);
        let topGridLimit = ceil(topFillExtent/spacing);
        let bottomGridExtent = ceil(bottomFillExtent/spacing);

        let minorAlpha = this.minGridLineAlpha + (
            this.maxGridLineAlpha - this.minGridLineAlpha
        ) * (spacing - m) / (spacing - belowSpacing);
        let majorAlpha = this.maxGridLineAlpha;

        let gridThickness = this.gridLineStyle.thickness;
        let gridColor = this.gridLineStyle.color;

        let originThickness = this.axisGridLineStyle.thickness;
        let originColor = this.axisGridLineStyle.color
        let originAlpha = this.axisGridLineStyle.alpha;

        let i;

        for (i = leftGridExtent; i < rightGridLimit; i++) {
            let x = i * spacing * s;
            if (i === 0) {
                grid.lineStyle(originThickness, originColor, originAlpha);
            } else if (i % majorMultiple === 0) {
                grid.lineStyle(gridThickness, gridColor, majorAlpha);
            } else {
                grid.lineStyle(gridThickness, gridColor, minorAlpha);
            }
            grid.moveTo(x, bottomY);
            grid.lineTo(x, topY);
        }

        for (i = bottomGridExtent; i < topGridLimit; i++) {
            let y = i * spacing * s;
            if (i === 0) {
                grid.lineStyle(originThickness, originColor, originAlpha);
            } else if (i % majorMultiple === 0) {
                grid.lineStyle(gridThickness, gridColor, majorAlpha);
            } else {
                grid.lineStyle(gridThickness, gridColor, minorAlpha);
            }
            grid.moveTo(leftX, y);
            grid.lineTo(rightX, y);
        }
    }

    updatePositions() {
        let sin = Math.sin;
        let abs = Math.abs;

        // ma - mean anomaly
        let ma = convertPhase(this.props.phase) * (2 * Math.PI);

        let e = this.props.eccentricity;

        // ea - eccentric anomaly (ea1 is the one that gets used)
        let ea0 = 0;
        let ea1 = ma + e*sin(ma);

        // find the eccentric anomaly
        let c = 0;
        do {
                ea0 = ea1;
                ea1 = ma + e*sin(ea0);
                c++;
        } while (abs(ea1-ea0)>0.001 && c<100);

        // ta - true anomaly
        let ta = 2*Math.atan(Math.sqrt((1+e)/(1-e))*Math.tan(ea1/2));

        let cosTa = Math.cos(ta);
        let sinTa = sin(ta);

        let k = (1-e*e)/(1+e*cosTa);
        let r1 = this._a1*k;
        let r2 = this._a2*k;

        let wx1 = -r1*cosTa;
        let wy1 = -r1*sinTa;

        let wx2 = r2*cosTa;
        let wy2 = r2*sinTa;

        c = this._c;

        let sx1 = wx1*c.a0 + wy1*c.a1;
        let sy1 = wx1*c.a3 + wy1*c.a4 + 0*c.a5;
        let sz1 = wx1*c.a6 + wy1*c.a7 + 0*c.a8;

        let sx2 = wx2*c.a0 + wy2*c.a1;
        let sy2 = wx2*c.a3 + wy2*c.a4 + 0*c.a5;
        let sz2 = wx2*c.a6 + wy2*c.a7 + 0*c.a8;

        // the line drawing function uses these points
        this._s1 = {x: sx1, y: sy1, z: sz1};
        this._s2 = {x: sx2, y: sy2, z: sz2};

        /*this.backHalfMC.body1MC._x = this.frontHalfMC.body1MC._x = this.frontHalfMC.mask1MC._x = sx1;
        this.backHalfMC.body1MC._y = this.frontHalfMC.body1MC._y = this.frontHalfMC.mask1MC._y = sy1;

        this.backHalfMC.body2MC._x = this.frontHalfMC.body2MC._x = this.frontHalfMC.mask2MC._x = sx2;
        this.backHalfMC.body2MC._y = this.frontHalfMC.body2MC._y = this.frontHalfMC.mask2MC._y = sy2;*/

        if (sz1>sz2) {
            //this.frontHalfMC.body1MC.swapDepths(200);
            //this.backHalfMC.body1MC.swapDepths(200);
        } else {
            //this.frontHalfMC.body2MC.swapDepths(200);
            //this.backHalfMC.body2MC.swapDepths(200);
        }
    }

    render() {
        return (
            <div ref={(thisDiv) => {this.el = thisDiv}} />
        );
    }

    componentDidMount() {
        this.app = new PIXI.Application({
            width: 400,
            height: 400,

            // The default is webgl - I'll switch to that if necessary
            // but for now canvas just displays my images better. I'm
            // guessing there's just some filters or settings I can add
            // to make it look good in webgl.
            forceCanvas: true,
            antialias: true,

            // as far as I know the ticker isn't necessary at the
            // moment.
            sharedTicker: true
        });

        this.el.appendChild(this.app.view);

        this.drawText(this.app);

        this.orbitalPlane = this.drawOrbitalPlane(this.app);
        this.app.stage.addChild(this.orbitalPlane);

        const me = this;
        this.app.loader.load((loader, resources) => {
            me.resources = resources;
        });

        this.initialize(this.initObject);
    }
    componentDidUpdate(prevProps) {
        if (prevProps.longitude !== this.props.longitude) {
            this._theta = getSystemTheta(this.props.longitude) * (Math.PI / 180);
        }

        if (prevProps.inclination !== this.props.inclination) {
            this._phi = getSystemPhi(this.props.inclination) * (Math.PI / 180);
        }

        if (
            prevProps.star1Mass !== this.props.star1Mass ||
            prevProps.star2Mass !== this.props.star2Mass ||
            prevProps.separation !== this.props.separation
        ) {
            this._massTotal = this.props.star1Mass + this.props.star2Mass;

            this._a1 = this.props.separation * this.props.star2Mass / this._massTotal;
            this._a2 = this.props.separation * this.props.star1Mass / this._massTotal;
        }

        if (
            prevProps.phase !== this.props.phase ||
            prevProps.star1Mass !== this.props.star1Mass ||
            prevProps.star2Mass !== this.props.star2Mass ||
            prevProps.star1Radius !== this.props.star1Radius ||
            prevProps.star2Radius !== this.props.star2Radius ||
            prevProps.separation !== this.props.separation ||
            prevProps.eccentricity !== this.props.eccentricity ||
            prevProps.longitude !== this.props.longitude ||
            prevProps.inclination !== this.props.inclination
        ) {
            this.rescale();
        }
    }

    drawOrbitalPlane(app) {
        const container = new PIXI.Container();

        const grid = new PIXI.Graphics();
        grid.name = 'grid';
        const path1 = new PIXI.Graphics();
        path1.name = 'path1';
        const path2 = new PIXI.Graphics();
        path2.name = 'path2';

        container.addChild(grid);
        container.addChild(path1);
        container.addChild(path2);
        app.stage.addChild(container);
        return container;
    }
    drawText(app) {
        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 14,
            fontStyle: 'italic',
            fontWeight: 'normal',
            fill: 0xffffff,
            align: 'center'
        })

        const text = new PIXI.Text('perspective from earth', textStyle);
        text.position.x = 14;
        text.position.y = 20;
        app.stage.addChild(text);

        const text2 = new PIXI.Text('system period: 2.58 days', textStyle);
        text2.position.x = 230;
        text2.position.y = 370;
        app.stage.addChild(text2);
    }
}

BinarySystemView.propTypes = {
    phase: PropTypes.number.isRequired,
    star1Mass: PropTypes.number.isRequired,
    star2Mass: PropTypes.number.isRequired,
    star1Radius: PropTypes.number.isRequired,
    star2Radius: PropTypes.number.isRequired,
    separation: PropTypes.number.isRequired,
    eccentricity: PropTypes.number.isRequired,
    inclination: PropTypes.number.isRequired,
    longitude: PropTypes.number.isRequired
};
