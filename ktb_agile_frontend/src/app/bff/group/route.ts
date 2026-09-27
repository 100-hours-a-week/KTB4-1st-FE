import type {
  GroupAddressResponse,
  GroupAddressResult,
  KakaoAddressDocument,
  KakaoAddressResponse,
} from '@/types/group'

const KAKAO_ADDRESS_SEARCH_URL =
  'https://dapi.kakao.com/v2/local/search/address.json'

function toCoordinate(value: string | undefined): number | null {
  if (value === undefined || value === '') return null

  const coordinate = Number(value)
  return Number.isFinite(coordinate) ? coordinate : null
}

function toGroupAddressResult(
  document: KakaoAddressDocument,
): GroupAddressResult {
  const roadAddress = document.road_address

  return {
    addressName: document.address_name,
    roadAddress: roadAddress?.address_name ?? null,
    roadName: roadAddress?.road_name ?? null,
    buildingName: roadAddress?.building_name || null,
    latitude: toCoordinate(roadAddress?.y ?? document.y),
    longitude: toCoordinate(roadAddress?.x ?? document.x),
  }
}

export async function GET(request: Request) {
  const kakaoRestApiKey = process.env.KAKAO_REST_API_KEY

  if (!kakaoRestApiKey) {
    return Response.json(
      { message: 'KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.' },
      { status: 500 },
    )
  }

  const query = new URL(request.url).searchParams.get('query')?.trim()

  if (!query) {
    return Response.json(
      { message: '검색할 주소(query)를 입력해주세요.' },
      { status: 400 },
    )
  }

  const url = new URL(KAKAO_ADDRESS_SEARCH_URL)
  url.searchParams.set('query', query)

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${kakaoRestApiKey}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return Response.json(
        { message: '카카오 주소 검색 API 호출에 실패했습니다.' },
        { status: 502 },
      )
    }
    const data = (await response.json()) as KakaoAddressResponse
    const filterData = data.documents.filter(address=> address.road_address !== null)

    const body: GroupAddressResponse = {
      meta: data.meta,
      results: filterData.map(toGroupAddressResult),
    }

    return Response.json(body)
  } catch {
    return Response.json(
      { message: '카카오 주소 검색 API와 통신할 수 없습니다.' },
      { status: 502 },
    )
  }
}
