import { supabase } from './supabase'

export async function searchEbaySoldListings({ brand, style, era, year, tour_or_event, graphic_keywords, sport, location }) {
  const { data, error } = await supabase.functions.invoke('ebay-search', {
    body: { brand, style, era, year, tour_or_event, graphic_keywords, sport, location },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data // { listings: Array<{title, price, url, image}>, query: string }
}

export async function discoverListings(shirts) {
  const { data, error } = await supabase.functions.invoke('ebay-discover', {
    body: { shirts },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data // { groups: Array<{id, title, listings}> }
}
