import { gql } from "@apollo/client"
import {
  Transaction,
  useCurrencyListQuery,
  useDisplayCurrencyQuery,
  WalletCurrency,
} from "@app/graphql/generated"
import { useIsAuthed } from "@app/graphql/is-authed-context"
import { DisplayCurrency, MoneyAmount, WalletOrDisplayCurrency } from "@app/types/amounts"
import { useCallback, useMemo } from "react"

gql`
  query displayCurrency {
    me {
      id
      defaultAccount {
        id
        displayCurrency
      }
    }
  }

  query currencyList {
    currencyList {
      __typename
      id
      flag
      name
      symbol
      fractionDigits
    }
  }
`

const defaultDisplayCurrency = {
  symbol: "$",
  id: "USD",
}

export const useDisplayCurrency = () => {
  const isAuthed = useIsAuthed()
  const { data: dataCurrencyList } = useCurrencyListQuery({ skip: !isAuthed })

  const { data } = useDisplayCurrencyQuery({ skip: !isAuthed })
  const displayCurrency =
    data?.me?.defaultAccount?.displayCurrency || defaultDisplayCurrency.id

  const displayCurrencyInfo = useMemo(() => {
    const currencyList = dataCurrencyList?.currencyList || []
    return (
      currencyList.find((currency) => currency.id === displayCurrency) ||
      defaultDisplayCurrency
    )
  }, [dataCurrencyList, displayCurrency])

  const formatToDisplayCurrency = useCallback(
    (amount: number) => {
      return Intl.NumberFormat("en-US", {
        style: "currency",
        currency: displayCurrency,
      }).format(amount)
    },
    [displayCurrency],
  )

  const formatToUsd = useCallback((amount: number) => {
    return Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }, [])

  // FIXME this should come from the backend and should be used in currency inputs
  const minorUnitToMajorUnitOffset = 2

  const moneyAmountToMajorUnitOrSats = useCallback(
    (moneyAmount: MoneyAmount<WalletOrDisplayCurrency>) => {
      switch (moneyAmount.currency) {
        case WalletCurrency.Btc:
          return moneyAmount.amount
        case WalletCurrency.Usd:
          return moneyAmount.amount / 100
        case DisplayCurrency:
          return moneyAmount.amount / 10 ** minorUnitToMajorUnitOffset
      }
    },
    [minorUnitToMajorUnitOffset],
  )

  const amountInMajorUnitOrSatsToMoneyAmount = useCallback(
    (
      amount: number,
      currency: WalletOrDisplayCurrency,
    ): MoneyAmount<WalletOrDisplayCurrency> => {
      switch (currency) {
        case WalletCurrency.Btc:
          return {
            amount: Math.round(amount),
            currency,
          }
        case WalletCurrency.Usd:
          return {
            amount: Math.round(amount * 100),
            currency,
          }
        case DisplayCurrency:
          return {
            amount: Math.round(amount * 10 ** minorUnitToMajorUnitOffset),
            currency,
          }
      }
    },
    [minorUnitToMajorUnitOffset],
  )

  const formatMoneyAmount = useCallback(
    (moneyAmount: MoneyAmount<WalletOrDisplayCurrency>): string => {
      if (moneyAmount.currency === WalletCurrency.Btc) {
        if (moneyAmount.amount === 1) {
          return "1 sat"
        }
        return (
          moneyAmount.amount.toLocaleString("en-US", {
            style: "decimal",
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
          }) + " sats"
        )
      }

      return Intl.NumberFormat("en-US", {
        style: "currency",
        currency:
          moneyAmount.currency === WalletCurrency.Usd
            ? WalletCurrency.Usd
            : displayCurrency,
      }).format(moneyAmountToMajorUnitOrSats(moneyAmount))
    },
    [displayCurrency, moneyAmountToMajorUnitOrSats],
  )

  // TODO: remove
  const computeUsdAmount = (tx: Transaction) => {
    const { settlementAmount, settlementPrice } = tx
    const { base, offset } = settlementPrice
    const usdPerSat = base / 10 ** offset / 100
    return settlementAmount * usdPerSat
  }

  return {
    minorUnitToMajorUnitOffset,
    formatToDisplayCurrency,
    fiatSymbol: displayCurrencyInfo.symbol,
    formatMoneyAmount,
    moneyAmountToMajorUnitOrSats,
    amountInMajorUnitOrSatsToMoneyAmount,
    computeUsdAmount,
    formatToUsd,
    displayCurrency,
  }
}
