export interface Institution {
  id: string
  name: string
  rorId: string
  oaiEndpoint: string | null
  oaiMetadataPrefix: string | null
  rebiunCode: string | null
  lastHarvestAt: string | null
  oaiStatus: 'ACTIVE' | 'UNREACHABLE' | 'DEGRADED'
  totalPublications: number
}

export interface InstitutionPageResponse {
  content: Institution[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
}

export interface InstitutionSummary {
  institutionId: string
  institutionName: string
  totalPublications: number
  oaStatusCounts: Record<string, number>
  oaPercentage: number
  foundInRepository: number
  yearlyBreakdown: Record<string, Record<string, number>>
}

export interface ApcYearBreakdown {
  year: number
  totalCost: number
  publicationsCount: number
  publicationsWithPrice: number
  coveredByAgreements: number
}

export interface ApcEstimate {
  institutionId: string
  institutionName: string
  totalEstimatedCost: number
  totalPublications: number
  publicationsWithPrice: number
  publicationsWithoutPrice: number
  coveredByAgreements: number
  directCost: number
  breakdownByYear: Record<string, ApcYearBreakdown>
}

export interface OaBreakdown {
  institutionId: string
  institutionName: string
  yearlyStatusCounts: Record<string, Record<string, number>>
  yearlyOaPercentage: Record<string, number>
}

export interface PublicationItem {
  id: string
  doi: string
  title: string
  publicationYear: number
  journalIssn: string | null
  journalName: string | null
  oaStatusOpenalex: string | null
  oaStatusResolved: string | null
  foundInRepository: boolean | null
  repositoryUrl: string | null
  apcEstimatedEur: number | null
  apcCoveredByAgreement: boolean | null
}

export interface PublicationPageResponse {
  content: PublicationItem[]
  page: {
    totalElements: number
    totalPages: number
    number: number
    size: number
  }
}
