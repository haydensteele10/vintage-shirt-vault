import { supabase } from './supabase'

export async function searchEbaySoldListings({ brand, style, era, year }) {
  const { data, error } = await supabase.functions.invoke('ebay-search', {
    body: { brand, style, era, year },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data // { listings: Array<{title, price, url, image}>, query: string }
}
