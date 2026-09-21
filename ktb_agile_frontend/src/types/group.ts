export type AddressSearchMeta = {
  total_count: number
  pageable_count: number
  is_end: boolean
}

export type KakaoRoadAddress = {
  address_name: string
  road_name: string
  building_name: string
  x: string
  y: string
}

export type KakaoAddressDocument = {
  address_name: string
  address_type: string
  x: string
  y: string
  road_address?: KakaoRoadAddress | null
}

export type KakaoAddressResponse = {
  meta: AddressSearchMeta
  documents: KakaoAddressDocument[]
}

export type GroupAddressResult = {
  addressName: string
  roadAddress: string | null
  roadName: string | null
  buildingName: string | null
  latitude: number | null
  longitude: number | null
}

export type GroupAddressResponse = {
  meta: AddressSearchMeta
  results: GroupAddressResult[]
}
