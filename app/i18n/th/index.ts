import { Translation } from "../i18n-types"
import en from '../en'
import rawTh from '../raw-i18n/translations/th.json'
import merge from "lodash.merge"

const th: Translation = merge({}, en as Translation, rawTh)

export default th
