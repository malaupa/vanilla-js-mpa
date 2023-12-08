/**
 * Loads a js object instance or instance method using given inject path.
 * The object to load have to implement the singleton pattern using a static getInstance method.
 * 
 * @param {string} injectPath
 */
export async function inject(injectPath) {
  const [modName, path] = injectPath.split('#');
  const [type, method] = path.split('.');
  const module = await import(modName);

  if (module[type]) {
    if (module[type].getInstance) {
      const instance = module[type].getInstance();
      if (method && instance[method]) {
        return instance[method].bind(instance);
      }
      return instance;
    } else {
      return module[type];
    }
  }
}

const injectMap = {};

export const InjectDynamic = new Proxy({}, {
  get(_, prop) {
    if (prop === 'getInstance') {
      return () => InjectDynamic;
    }
    if (injectMap[prop]) {
      return injectMap[prop];
    }
  }
});

export function registerDynamicInject(id, func) {
  injectMap[id] = func;
}