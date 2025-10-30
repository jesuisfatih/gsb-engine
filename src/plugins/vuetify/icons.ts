import type { IconAliases, IconProps } from 'vuetify'

import checkboxChecked from '@images/svg/checkbox-checked.svg'
import checkboxIndeterminate from '@images/svg/checkbox-indeterminate.svg'
import checkboxUnchecked from '@images/svg/checkbox-unchecked.svg'
import radioChecked from '@images/svg/radio-checked.svg'
import radioUnchecked from '@images/svg/radio-unchecked.svg'

const customIcons: Record<string, unknown> = {
  'mdi-checkbox-blank-outline': checkboxUnchecked,
  'mdi-checkbox-marked': checkboxChecked,
  'mdi-minus-box': checkboxIndeterminate,
  'mdi-radiobox-marked': radioChecked,
  'mdi-radiobox-blank': radioUnchecked,
}

const aliases: Partial<IconAliases> = {
  calendar: 'mdi-calendar',
  collapse: 'mdi-chevron-up',
  complete: 'mdi-check',
  cancel: 'mdi-close',
  close: 'mdi-close',
  delete: 'mdi-close-circle',
  clear: 'mdi-close-circle-outline',
  success: 'mdi-check-circle',
  info: 'mdi-information',
  warning: 'mdi-alert',
  error: 'mdi-alert-circle',
  prev: 'mdi-chevron-left',
  ratingEmpty: 'mdi-star-outline',
  ratingFull: 'mdi-star',
  ratingHalf: 'mdi-star-half-full',
  next: 'mdi-chevron-right',
  delimiter: 'mdi-circle-small',
  sort: 'mdi-arrow-up',
  expand: 'mdi-chevron-down',
  menu: 'mdi-menu',
  subgroup: 'mdi-menu-down',
  dropdown: 'mdi-menu-down',
  edit: 'mdi-pencil',
  loading: 'mdi-cached',
  first: 'mdi-page-first',
  last: 'mdi-page-last',
  unfold: 'mdi-unfold-more-horizontal',
  file: 'mdi-paperclip',
  plus: 'mdi-plus',
  minus: 'mdi-minus',
  sortAsc: 'mdi-arrow-up',
  sortDesc: 'mdi-arrow-down',
}

export const iconify = {
  component: (props: IconProps) => {
    // Load custom SVG directly instead of going through icon component
    if (typeof props.icon === 'string') {
      const iconComponent = customIcons[props.icon]

      if (iconComponent)
        return h(iconComponent)
    }

    return h(
      props.tag,
      {
        ...props,

        // As we are using class based icons
        class: [props.class, props.icon],

        // Remove used props from DOM rendering
        tag: undefined,
        icon: undefined,
      },
    )
  },
}

export const icons = {
  defaultSet: 'iconify',
  aliases,
  sets: {
    iconify,
  },
}
