// @flow

import cheerio from 'cheerio';
import path from 'path';
import debug from 'debug';
import axios from './axios';
import tagsLoad from './listSrc';
import getFileName from './getFileName';
import getCurrentLink from './getCurrentLink';

const sourcesDebug = debug('page-loader:src');
const sourceFailLoad = debug('page-loader:src_fail_load');

const getLinks = (html, hostname) => {
  const $ = cheerio.load(html);
  return tagsLoad().reduce((acc, tagLoad) => {
    const links = $('html').find(tagLoad.name);
    links.filter(tag => $(links[tag]).attr(tagLoad.src)).toArray()
    .forEach((link) => {
      const currentLink = getCurrentLink(hostname, link.attribs[tagLoad.src]);
      if (acc.indexOf(currentLink) === -1) {
        acc.push(currentLink);
      }
    });
    return acc;
  }, []);
};

export default (html, hostname, task) => {
  const links = getLinks(html, hostname);
  const promises = links.map((link) => {
    if (task) {
      return Promise.resolve(task(link, axios.get, { responseType: 'arraybuffer' }));
    }
    return axios.get(link, { responseType: 'arraybuffer' })
    .catch((err) => {
      sourceFailLoad(err);
      return err;
    });
  });
  return Promise.all(promises)
  .then(data => data.filter(file => file))
  .then(data => data.map((file) => {
    sourcesDebug(`loaded file '${file.config.url}'`);
    const ext = path.extname(file.config.url);
    const pathSave = `${getFileName(file.config.url)}${ext}`;
    return { pathSave, data: file.data, url: file.config.url };
  }));
};
