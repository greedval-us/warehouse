import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NtExecutable, NtExecutableResource } from 'pe-library';
import { Data, Resource } from 'resedit';

export function editWindowsResources({ appOutDir, packager }) {
  const info = packager.appInfo;
  const filename = `${info.productFilename}.exe`;
  const target = join(appOutDir, filename);
  const executable = NtExecutable.from(readFileSync(target), { ignoreCert: true });
  const resources = NtExecutableResource.from(executable);
  const icons = Data.IconFile.from(readFileSync(new URL('../src/public/icons/app.ico', import.meta.url))).icons.map(entry => entry.data);
  const groups = Resource.IconGroupEntry.fromEntries(resources.entries);
  for (const group of groups.length ? groups : [{ id: 1, lang: 1033 }]) {
    Resource.IconGroupEntry.replaceIconsForResource(resources.entries, group.id, group.lang, icons);
  }
  const locale = { lang: 1033, codepage: 1200 };
  const versions = Resource.VersionInfo.fromEntries(resources.entries);
  for (const version of versions.length ? versions : [Resource.VersionInfo.createEmpty()]) {
    version.setFileVersion(info.version, locale.lang);
    version.setProductVersion(info.version, locale.lang);
    version.setStringValues(locale, { FileDescription: info.productName, ProductName: info.productName,
      CompanyName: info.companyName || info.productName, InternalName: info.productName,
      OriginalFilename: filename, LegalCopyright: info.copyright || '' });
    version.outputToResourceEntries(resources.entries);
  }
  resources.outputResource(executable);
  writeFileSync(target, Buffer.from(executable.generate()));
}
