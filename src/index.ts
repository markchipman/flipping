type Bounds = {
  top?: Number;
  left?: Number;
  width?: Number;
  height?: Number;
};

const rect = (node: Element): Bounds => {
  const {
    top,
    left,
    width,
    height,
  } = node.getBoundingClientRect();
  
  return { top, left, width, height };
}

const waapiOnFlip = ({ delta, node }) => {
  return node.animate([
    {transformOrigin: 'top left', transform: `translate(${delta.left}px, ${delta.top}px) scale(${delta.width}, ${delta.height})`},
    {transformOrigin: 'top left', transform: `translate(0,0) scale(1)`}
  ], 3000);
}

const waapiOnRead = ({ animation }) => animation && animation.cancel && animation.cancel();

type FlippingOptions = {
  getDelta?: (Bounds) => Bounds,
  getBounds?: (Element) => Bounds,
  selector?: () => NodeListOf<Element>,
  onFlip?: (state: FlipState) => any,
  onRead?: (state: ReadState) => void,
};

function forEach(array: ArrayLike<any>, callback: Function): void {
  for (let i = 0; i < array.length; i++) {
    callback(array[i], i, array);
  }
}

type FlipState = {
  key: string,
  node: Element,
  first: Bounds,
  last: Bounds,
  delta: Bounds,
  type: 'ENTER' | 'MOVE' | 'LEAVE',
  animation: any,
};

type ReadState = {
  key: string,
  node: Element,
  bounds: Bounds,
  animation: any,
};

type ListenerDict<T> = {
  [key: string]: (state: T) => void;
};

function getDelta(a: Bounds, b: Bounds): Bounds {
  if (!a.height) { return a };
  if (!b.height) { return b };
  return {
    top: <number>a.top - <number>b.top,
    left: <number>a.left - <number>b.left,
    width: <number>a.width / <number>b.width,
    height: <number>a.height / <number>b.height,
  };
}

class Flipping {
  selector: (Element) => NodeListOf<Element>;
  getBounds: (Element) => Bounds;
  getKey: (Element) => String;
  getDelta: (first: Bounds, last: Bounds) => Bounds;
  flipListeners: ListenerDict<FlipState>;
  readListeners: ListenerDict<ReadState>;
  bounds: { [key: string]: Bounds };
  animations: { [key: string]: any };
  onFlip?: (state: FlipState) => any;
  onRead?: (state: ReadState) => void;

  public static web(options: FlippingOptions) {
    return new Flipping({
      onRead: waapiOnRead,
      onFlip: waapiOnFlip,
      ...options,
    });
  }

  constructor(options: FlippingOptions = {}) {
    const selector = (parentNode) => parentNode.querySelectorAll('[data-key]');

    this.selector = options.selector || selector;
    this.getBounds = options.getBounds || rect;
    this.getDelta = options.getDelta || getDelta;
    this.getKey = (node) => node.getAttribute('data-key');
    this.onFlip = options.onFlip;
    this.onRead = options.onRead;

    this.flipListeners = {};
    this.readListeners = {};

    this.bounds = {};
    this.animations = {};
  }
  read(parentNode: Element = document.documentElement) {
    let nodes: NodeList = this.selector(parentNode);

    forEach(nodes, (node) => {
      const key = <string>this.getKey(node);
      const bounds = this.bounds[key] = this.getBounds(node);
      const animation = this.animations[key];

      const state: ReadState = {
        key,
        node,
        bounds,
        animation,
      };

      this.onRead(state);
    });
  }
  flip(parentNode: Element = document.documentElement) {
    let nodes: NodeList = this.selector(parentNode);

    forEach(nodes, (node) => {
      const key = <string>this.getKey(node);
      const first = this.bounds[key];
      const last = this.getBounds(node);

      const state: FlipState = {
        key,
        node,
        first,
        last,
        delta: this.getDelta(first, last),
        type: !first ? 'ENTER' : !last ? 'LEAVE' : 'MOVE',
        animation: this.animations[key],
      };

      this.animations[key] = this.onFlip(state);
    });
  }
  flipper(fn: Function): Function {
    return (...args) => {
      this.read();
      const result = fn(...args);
      this.flip();
      return result;
    }
  }
}

export default Flipping;