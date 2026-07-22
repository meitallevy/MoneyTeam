// Backwards-compatible shim: pages still call useLookups(), but the data now
// comes from a single shared provider (fetched once) instead of each page
// running its own queries. See src/context/LookupsContext.jsx.
export { useLookupsContext as useLookups, catLabel } from '../context/LookupsContext'
