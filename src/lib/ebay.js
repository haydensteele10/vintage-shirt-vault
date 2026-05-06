import { supabase } from './supabase'

export async function searchEbaySoldListings(params) {
  const { data, error } = await supabase.functions.invoke('ebay-search', {
    body: params,
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data // { listings: Array<{title, price, url, image}>, query: string }
}

export async function searchEbayActiveListings(query) {
  const { data, error } = await supabase.functions.invoke('ebay-search', {
    body: { query },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data // { listings, query, avgPrice }
}

export async function discoverListings(shirts) {
  const { data, error } = await supabase.functions.invoke('ebay-discover', {
    body: { shirts },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data // { groups: Array<{id, title, listings}> }
}
