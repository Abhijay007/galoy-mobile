import {
  UserDefaultWalletIdLazyQueryHookResult,
  WalletCurrency,
} from "@app/graphql/generated"
import { fetchLnurlPaymentParams } from "@galoymoney/client"
import { LnurlPaymentDestination, PaymentType } from "@galoymoney/client/dist/parsing-v2"
import { getParams } from "js-lnurl"
import { LnUrlPayServiceResponse } from "lnurl-pay/dist/types/types"
import { createLnurlPaymentDetails } from "../payment-details"
import {
  CreatePaymentDetailParams,
  DestinationDirection,
  InvalidDestinationReason,
  ResolvedLnurlPaymentDestination,
  ReceiveDestination,
  PaymentDestination,
  ParseDestinationResult,
} from "./index.types"
import { resolveIntraledgerDestination } from "./intraledger"

export type ResolveLnurlDestinationParams = {
  parsedLnurlDestination: LnurlPaymentDestination
  lnurlDomains: string[]
  userDefaultWalletIdQuery: UserDefaultWalletIdLazyQueryHookResult[0]
  myWalletIds: string[]
}

export const resolveLnurlDestination = async ({
  parsedLnurlDestination,
  lnurlDomains,
  userDefaultWalletIdQuery,
  myWalletIds,
}: ResolveLnurlDestinationParams): Promise<ParseDestinationResult> => {
  // TODO: Move all logic to galoy client or out of galoy client, currently lnurl pay is handled by galoy client
  // but lnurl withdraw is handled here

  if (parsedLnurlDestination.valid) {
    const lnurlParams = await getParams(parsedLnurlDestination.lnurl)

    // Check for lnurl withdraw request
    if ("tag" in lnurlParams && lnurlParams.tag === "withdrawRequest") {
      return createLnurlWithdrawDestination({
        lnurl: parsedLnurlDestination.lnurl,
        callback: lnurlParams.callback,
        domain: lnurlParams.domain,
        k1: lnurlParams.k1,
        defaultDescription: lnurlParams.defaultDescription,
        minWithdrawable: lnurlParams.minWithdrawable,
        maxWithdrawable: lnurlParams.maxWithdrawable,
      })
    }

    // Check for lnurl pay request
    try {
      const lnurlPayParams = await fetchLnurlPaymentParams({
        lnUrlOrAddress: parsedLnurlDestination.lnurl,
      })

      if (lnurlPayParams) {
        const maybeIntraledgerDestination = await tryGetIntraLedgerDestinationFromLnurl({
          lnurlDomains,
          lnurlPayParams,
          myWalletIds,
          userDefaultWalletIdQuery,
        })
        if (maybeIntraledgerDestination && maybeIntraledgerDestination.valid) {
          return maybeIntraledgerDestination
        }

        return createLnurlPaymentDestination({
          lnurlParams: lnurlPayParams,
          ...parsedLnurlDestination,
        })
      }
    } catch {
      // Do nothing because it may be a lnurl withdraw request
    }

    return {
      valid: false,
      invalidReason: InvalidDestinationReason.LnurlUnsupported,
      invalidPaymentDestination: parsedLnurlDestination,
    } as const
  }

  return {
    valid: false,
    invalidReason: InvalidDestinationReason.LnurlError,
    invalidPaymentDestination: parsedLnurlDestination,
  } as const
}

type tryGetIntraLedgerDestinationFromLnurlParams = {
  lnurlPayParams: LnUrlPayServiceResponse
  lnurlDomains: string[]
  userDefaultWalletIdQuery: UserDefaultWalletIdLazyQueryHookResult[0]
  myWalletIds: string[]
}

const tryGetIntraLedgerDestinationFromLnurl = ({
  lnurlPayParams,
  lnurlDomains,
  userDefaultWalletIdQuery,
  myWalletIds,
}: tryGetIntraLedgerDestinationFromLnurlParams) => {
  const intraLedgerHandleFromLnurl = getIntraLedgerHandleIfLnurlIsOurOwn({
    lnurlPayParams,
    lnurlDomains,
  })

  if (intraLedgerHandleFromLnurl) {
    return resolveIntraledgerDestination({
      parsedIntraledgerDestination: {
        paymentType: PaymentType.Intraledger,
        handle: intraLedgerHandleFromLnurl,
      },
      userDefaultWalletIdQuery,
      myWalletIds,
    })
  }

  return undefined
}

const getIntraLedgerHandleIfLnurlIsOurOwn = ({
  lnurlPayParams,
  lnurlDomains,
}: {
  lnurlPayParams: LnUrlPayServiceResponse
  lnurlDomains: string[]
}) => {
  const [username, domain] = lnurlPayParams.identifier.split("@")
  if (domain && lnurlDomains.includes(domain)) {
    return username
  }
  return undefined
}

export const createLnurlPaymentDestination = (
  resolvedLnurlPaymentDestination: ResolvedLnurlPaymentDestination & { valid: true },
): PaymentDestination => {
  const createPaymentDetail = <T extends WalletCurrency>({
    convertPaymentAmount,
    sendingWalletDescriptor,
  }: CreatePaymentDetailParams<T>) => {
    return createLnurlPaymentDetails({
      lnurl: resolvedLnurlPaymentDestination.lnurl,
      lnurlParams: resolvedLnurlPaymentDestination.lnurlParams,
      sendingWalletDescriptor,
      destinationSpecifiedMemo: resolvedLnurlPaymentDestination.lnurlParams.description,
      convertPaymentAmount,
      unitOfAccountAmount: {
        amount: 0,
        currency: WalletCurrency.Btc,
      },
    })
  }
  return {
    valid: true,
    destinationDirection: DestinationDirection.Send,
    validDestination: resolvedLnurlPaymentDestination,
    createPaymentDetail,
  } as const
}

export type CreateLnurlWithdrawDestinationParams = {
  lnurl: string
  callback: string
  domain: string
  k1: string
  defaultDescription: string
  minWithdrawable: number
  maxWithdrawable: number
}

export const createLnurlWithdrawDestination = (
  params: CreateLnurlWithdrawDestinationParams,
): ReceiveDestination => {
  return {
    valid: true,
    destinationDirection: DestinationDirection.Receive,
    validDestination: {
      ...params,
      valid: true,
    },
  } as const
}
