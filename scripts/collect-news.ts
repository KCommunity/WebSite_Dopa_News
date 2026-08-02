import { collectFromSources, DEFAULT_SOURCES } from "../src/lib/collection";
import { readStore, writeStore } from "../src/lib/store";

async function main() {
  const store = await readStore();
  if (store.sources.length === 0) {
    store.sources = DEFAULT_SOURCES;
    await writeStore(store);
  }

  const result = await collectFromSources(
    store.sources.length ? store.sources : DEFAULT_SOURCES,
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
