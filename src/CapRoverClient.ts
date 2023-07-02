import axios, { AxiosError, AxiosInstance } from 'axios'

interface CapRoverResponse<T> {
  status: number
  description: string
  data: T
}

interface Jwt {
  data: {
    namespace: string
    tokenVersion: string
  }
  iat: number
  exp: number
}

interface UnusedImage {
  id: string
  tags: string[]
}

interface UnusedImagesData {
  unusedImages: UnusedImage[]
}

export class CapRoverClient {
  private client: AxiosInstance
  private token?: string

  constructor(baseUrl: string, private readonly password: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      withCredentials: true
    })

    this.client.interceptors.request.use((value) => {
      value.headers.set('X-Namespace', 'captain')
      if (this.token) {
        value.headers.set('X-Captain-Auth', this.token)
      }
      return value
    })
  }

  public get exp(): number {
    return (this.jwtContent?.exp ?? 0) * 1000
  }

  public get jwtContent(): Jwt | undefined {
    if (!this.token) {
      return undefined
    }

    const base64Url = this.token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        })
        .join('')
    )

    const content = JSON.parse(jsonPayload)

    if (content.exp * 1000 < new Date().getTime()) {
      this.token = undefined
      return undefined
    }

    return content
  }

  public async login(): Promise<void> {
    if (this.exp > new Date().getTime()) return

    try {
      const res = await this.client.post('login', { password: this.password })
      this.token = res.data.data.token
    } catch (e) {
      const axiosError = e as AxiosError
      console.log('error ;/', axiosError.status, axiosError.message)
    }
  }

  public async cleanupDockerImages(keep: number) {
    await this.login()

    const res = await this.client.get<CapRoverResponse<UnusedImagesData>>(
      `user/apps/appDefinitions/unusedImages?mostRecentLimit=${keep}`
    )

    console.log('fetching images:', `${res.data.description} (${res.data.status})`)

    for (let image of res.data.data.unusedImages) {
      const deleteRes = await this.client.post('user/apps/appDefinitions/deleteImages', {
        imageIds: [image.id]
      })

      console.log(image.id, image.tags, `${deleteRes.data.description} (${deleteRes.data.status})`, deleteRes.data.data)
    }
  }
}
