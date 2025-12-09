import { singleton } from 'tsyringe'
import {
  ILlmQuota,
  OrgPackage,
  PackageInfo,
} from '../../../../interface/billing'

// -------------------------------- CONSTANT -------------------------------- //
/**giá trị đại diện cho không giới hạn */
export const UNLIMITED_VALUE = 9999999999999
/**số mili giây trong 1 ngày */
export const DAY_IN_MS = 1000 * 60 * 60 * 24
/**số mili giây trong 1 tháng */
export const MONTH_IN_MS = DAY_IN_MS * 30
/**số mili giây trong 1 năm */
export const YEAR_IN_MS = MONTH_IN_MS * 12
/**giá cơ bản khi mua thêm */
export const EXTRA_BASE: Pick<
  PackageInfo,
  | 'EXTRA_PAGE_PRICE'
  | 'EXTRA_STAFF_PRICE'
  | 'EXTRA_FAU_PRICE'
  | 'EXTRA_AI_TEXT_PRICE'
  | 'EXTRA_AI_IMAGE_PRICE'
  | 'EXTRA_AI_SOUND_PRICE'
  | 'EXTRA_AI_VIDEO_PRICE'
> = {
  EXTRA_PAGE_PRICE: 2000, // 2.000 VND / ngày
  EXTRA_STAFF_PRICE: 1000, // 1.000 VND / ngày

  EXTRA_FAU_PRICE: 50000 / 10000, // 50.000 VND / 10.000 FAU

  EXTRA_AI_TEXT_PRICE: 25000 / 1000000, // 25.000 VND / 1.000.000 ký tự
  EXTRA_AI_IMAGE_PRICE: 25000 / 1000, // 25.000 VND / 1.000 ảnh
  EXTRA_AI_SOUND_PRICE: 25000 / (60 * 1000), // 25.000 VND / 1.000 phút

  EXTRA_AI_VIDEO_PRICE: 6000 / (60 * 10), // 6.000 VND / 10 phút
}

/**dữ liệu cơ bản của gói PRO */
const PRO_PACKGE_BASE: Omit<PackageInfo, 'PRICE' | 'DURATION'> = {
  PAGE: 5,
  STAFF: 10,
  CLIENT: UNLIMITED_VALUE, // không giới hạn

  FAU: 10_000, // 10.000 FAU
  AI_TEXT: 10_000_000, // 10.000.000 ký tự
  AI_IMAGE: 1_000, // 1.000 ảnh
  AI_SOUND: 1_000 * 60, // 1.000 phút
  AI_VIDEO: 10 * 60, // 10 phút
}
/**dữ liệu cơ bản của gói không giới hạn */
const UNLIMITED_PACKAGE_BASE: Omit<PackageInfo, 'PRICE' | 'STAFF'> = {
  PAGE: UNLIMITED_VALUE, // không giới hạn
  DURATION: YEAR_IN_MS, // 12 tháng
  CLIENT: UNLIMITED_VALUE, // không giới hạn
  FAU: 50_000, // 50.000 FAU

  AI_TEXT: 10_000_000, // 10.000.000 ký tự
  AI_IMAGE: 1_000, // 1.000 ảnh
  AI_SOUND: 100 * 60, // 100 phút
  AI_VIDEO: 10 * 60, // 10 phút

  // DISCOUNT: {
  //   PERCENT: 20, // 20%
  //   AMOUNT_MONTH: 12, // 12 tháng - 1 năm
  // },
}

/**các dữ liệu giống nhau ở gói a tiến */
const A_TIEN_PACKAGE_BASE: Omit<
  PackageInfo,
  | 'PRICE'
  | 'PAGE'
  | 'STAFF'
  | 'AI_TEXT'
  | 'AI_IMAGE'
  | 'FAU'
  | 'AI_SOUND'
  | 'AI_VIDEO'
> = {
  DURATION: YEAR_IN_MS, // 12 tháng
  CLIENT: UNLIMITED_VALUE, // không giới hạn
  // DISCOUNT: {
  //   PERCENT: 20, // 20%
  //   AMOUNT_MONTH: 12, // 12 tháng - 1 năm
  // },
  ...EXTRA_BASE,
}

/**các dữ liệu dùng chung của gói unli chatbot cũ */
const CHATBOT_UNLIMITED_BASE: Omit<PackageInfo, 'DURATION'> = {
  IS_NOT_RESET_QUOTA: true, // không reset quota

  PRICE: 25_000_000, // 25.000.000 VND

  PAGE: UNLIMITED_VALUE, // không giới hạn trang
  STAFF: UNLIMITED_VALUE, // không giới hạn nhân viên
  CLIENT: UNLIMITED_VALUE, // không giới hạn khách hàng

  FAU: 500_000, // 500.000 FAU

  // không có AI
  AI_TEXT: 0,
  AI_IMAGE: 0,
  AI_SOUND: 0,
  AI_VIDEO: 0,

  ...EXTRA_BASE,
}

/**giới hạn của agent free */
export const LLM_FREE: ILlmQuota = {
  AGENT: 1,
  DOCUMENT: 2,
  SIZE: 0.5, // nửa mb
}

/**giới hạn của agent pro */
export const LLM_PRO: ILlmQuota = {
  AGENT: 5,
  DOCUMENT: 10,
  SIZE: 5, // 5 mb
}
/**dữ liệu cơ bản của gói lite */
export const LITE_PACKGE_BASE: Omit<PackageInfo, 'PRICE' | 'DURATION'> = {
  ...PRO_PACKGE_BASE,

  PAGE: 3,
  STAFF: 3,

  AI_TEXT: 1_000_000, // 1.000.000 ký tự
  AI_IMAGE: 1_000, // 1.000 ảnh
  AI_SOUND: 1_000 * 60, // 1.000 phút
  AI_VIDEO: 10 * 60, // 10 phút
}
/** dữ liệu cơ bản của gói business */
export const BUSINESS_PACKGE_BASE: Omit<PackageInfo, 'PRICE' | 'DURATION'> = {
  PAGE: 40,
  STAFF: 40,
  CLIENT: UNLIMITED_VALUE, // không giới hạn

  FAU: 50_000, // 50.000 FAU
  AI_TEXT: 50_000_000, // 50.000.000 ký tự
  AI_IMAGE: 10_000, // 10.000 ảnh
  AI_SOUND: 10_000 * 60, // 10.000 phút
  AI_VIDEO: 100 * 60, // 100 phút
}

/**dữ liệu của các gói */
export const LIST_PACKAGE: Record<OrgPackage, PackageInfo> = {
  /**gói miễn phí, sản phẩm phễu */
  FREE: {
    PRICE: 0, // miễn phí
    PAGE: 2,
    STAFF: 1,
    DURATION: UNLIMITED_VALUE, // không giới hạn thời gian
    CLIENT: 600, // 600 khách hàng / tháng
    FAU: 1_000, // 1.000 FAU

    AI_TEXT: 100_000, // 100.000 ký tự
    AI_IMAGE: 100, // 100 ảnh
    AI_SOUND: 100 * 60, // 100 phút
    AI_VIDEO: 0, // 0 phút
    LLM: LLM_FREE,
  },
  /**gói dùng thử, thiết lập chung giống gói pro */
  TRIAL: {
    PRICE: 0,
    DURATION: DAY_IN_MS * 7, // 1 tuần
    ...PRO_PACKGE_BASE,
    ...EXTRA_BASE,
  },
  TRIAL_LITE: {
    PRICE: 0,
    DURATION: DAY_IN_MS * 7, // 1 tuần
    ...LITE_PACKGE_BASE,
    ...EXTRA_BASE,
  },
  TRIAL_BUSINESS: {
    PRICE: 0,
    DURATION: DAY_IN_MS * 7, // 1 tuần
    ...BUSINESS_PACKGE_BASE,
    ...EXTRA_BASE,
  },
  /**gói lite, không có AI */
  LITE: {
    PRICE: 199_000, // 199.000 VND
    DURATION: MONTH_IN_MS, // 1 tháng

    ...LITE_PACKGE_BASE,
    ...EXTRA_BASE,
  },
  /**gói pro, được mặc định giảm giá khi mua 1 năm */
  PRO: {
    PRICE: 480_000, // 480.000 VND
    DURATION: MONTH_IN_MS, // 1 tháng
    // DISCOUNT: {
    //   PERCENT: 40, // 40% -> 3456
    //   AMOUNT_MONTH: 12, // 12 tháng || 1 năm -> 5760
    // },
    ...PRO_PACKGE_BASE,
    ...EXTRA_BASE,
  },
  /**gói của Tuấn, chỉ tăng FAU */
  PRO_2: {
    PRICE: 960_000, // 960.000 VND
    DURATION: MONTH_IN_MS, // 1 tháng
    // DISCOUNT: {
    //   PERCENT: 40, // 40% -> 6912
    //   AMOUNT_MONTH: 12, // 12 tháng || 1 năm -> 11.520
    // },
    ...PRO_PACKGE_BASE,
    ...EXTRA_BASE,
    FAU: 30_000, // 30.000 FAU // ghi đè lại số fau
  },
  /**gói pro gấp đôi */
  PRO_2X: {
    PRICE: 960_000, // 960.000 VND
    DURATION: MONTH_IN_MS, // 1 tháng
    // DISCOUNT: {
    //   PERCENT: 40, // 40% -> 6912
    //   AMOUNT_MONTH: 12, // 12 tháng || 1 năm -> 11.520
    // },

    PAGE: 10, // 10 trang
    STAFF: 20, // 20 nhân viên
    CLIENT: UNLIMITED_VALUE, // không giới hạn khách hàng

    FAU: 20_000, // 20.000 FAU
    AI_TEXT: 20_000_000, // 20.000.000 ký tự
    AI_IMAGE: 2_000, // 2.000 ảnh
    AI_SOUND: 2_000 * 60, // 2.000 phút
    AI_VIDEO: 20 * 60, // 20 phút

    ...EXTRA_BASE,
  },
  /**gói pro gấp đôi */
  PRO_3X: {
    PRICE: 1_440_000, // 1.440.000 VND
    DURATION: MONTH_IN_MS, // 1 tháng
    // DISCOUNT: {
    //   PERCENT: 40, // 40% -> 6912
    //   AMOUNT_MONTH: 12, // 12 tháng || 1 năm -> 11.520
    // },

    PAGE: 15, // 15 trang
    STAFF: 30, // 30 nhân viên
    CLIENT: UNLIMITED_VALUE, // không giới hạn khách hàng

    FAU: 30_000, // 30.000 FAU
    AI_TEXT: 30_000_000, // 30.000.000 ký tự
    AI_IMAGE: 3_000, // 3.000 ảnh
    AI_SOUND: 3_000 * 60, // 3.000 phút
    AI_VIDEO: 30 * 60, // 30 phút

    ...EXTRA_BASE,
  },

  /**gói riêng a tùng: shop khách bán sữa */
  MILK_1: {
    PRICE: 199_000, // 199.000 VND
    DURATION: MONTH_IN_MS, // 1 tháng
    // DISCOUNT: {
    //   PERCENT: 40, // 40% -> 3456
    //   AMOUNT_MONTH: 12, // 12 tháng || 1 năm -> 5760
    // },
    ...PRO_PACKGE_BASE,
    ...EXTRA_BASE,

    PAGE: 1,
    STAFF: 2,
  },

  /**gói doanh nghiệp */
  BUSINESS: {
    PRICE: 2_600_000, // 2.600.000 VND
    DURATION: MONTH_IN_MS, // 1 tháng
    // DISCOUNT: {
    //   PERCENT: 20, // 20%
    //   AMOUNT_MONTH: 12, // 12 tháng || 1 năm
    // },

    ...BUSINESS_PACKGE_BASE,

    ...EXTRA_BASE,
  },
  /**gói không giới hạn 25m, có giới hạn nhân viên */
  UNLIMITED_25: {
    PRICE: 25_000_000, // 25.000.000 VND
    STAFF: 30,
    ...UNLIMITED_PACKAGE_BASE,
    ...EXTRA_BASE,
  },
  /**gói không giới hạn 40m, có giới hạn nhân viên */
  UNLIMITED_40: {
    PRICE: 40_000_000, // 40.000.000 VND
    STAFF: 60,
    ...UNLIMITED_PACKAGE_BASE,
    ...EXTRA_BASE,
  },
  /**gói không giới hạn 85m max, không giới hạn tất cả */
  UNLIMITED_85: {
    PRICE: 85_000_000, // 85.000.000 VND
    STAFF: UNLIMITED_VALUE, // không giới hạn
    ...UNLIMITED_PACKAGE_BASE,
    ...EXTRA_BASE,
  },

  // ---------------------------- gói của a tiến ---------------------------- //
  CHATBOT_AI_BASE: {
    PRICE: 31_200_000, // 31.200.000 VND -> 24.960.000 VND + 6.240.000 VND
    PAGE: 24,
    STAFF: 20,
    AI_TEXT: 50_000_000, // 50.000.000 ký tự
    AI_IMAGE: 50_000, // 50.000 ảnh
    FAU: 108_000, // 108.000 FAU

    ...A_TIEN_PACKAGE_BASE,

    AI_SOUND: 50000 * 60, // 50.000 phút
    AI_VIDEO: 5000 * 60, // 5.000 phút

    APP: {
      INTEGRATE_3RD_SYSTEM: 1,
      APP_APPON: 1,
    },
  },
  CHATBOT_AI_BUSINESS: {
    PRICE: 76_800_000, // 76.800.000 VND
    PAGE: 80,
    STAFF: 30,
    AI_TEXT: 200_000_000, // 150.000.000 ký tự
    AI_IMAGE: 200_000, // 500.000 ảnh
    FAU: 200_000, // 186.000 FAU

    ...A_TIEN_PACKAGE_BASE,

    AI_SOUND: 200_000, // 500.000 phút
    AI_VIDEO: 20_000 * 60, // 50.000 phút

    APP: {
      INTEGRATE_3RD_SYSTEM: 1,
      APP_APPON: 5,
    },
  },
  CHATBOT_AI_BUSINESS_1_4: {
    PRICE: 19_200_000, // 19.200.000 VND
    PAGE: 20,
    STAFF: 8,
    AI_TEXT: 50_000_000, // 50.000.000 ký tự
    AI_IMAGE: 50_000, // 50.000 ảnh
    FAU: 50_000, // 50.000 FAU

    ...A_TIEN_PACKAGE_BASE,

    AI_SOUND: 50_000, // 500.000 phút
    AI_VIDEO: 5_000 * 60, // 50.000 phút

    APP: {
      INTEGRATE_3RD_SYSTEM: 1,
      APP_APPON: 5,
    },
  },
  CHATBOT_AI_PRO: {
    PRICE: 161_280_000, // 161.280.000 VND
    PAGE: 190,
    STAFF: 40,
    AI_TEXT: 40_000_000, // 40.000.000 ký tự
    AI_IMAGE: 40_000, // 40.000 ảnh
    FAU: 300_000, // 300.000 FAU

    ...A_TIEN_PACKAGE_BASE,

    AI_SOUND: 40_000 * 60, // 40.000 phút
    AI_VIDEO: 4_000 * 60, // 4.000 phút

    APP: {
      INTEGRATE_3RD_SYSTEM: 1,
      APP_APPON: 5,
    },
  },
  CHATBOT_AI_ENTERPRISE: {
    PRICE: 382_920_000, // 382.920.000 VND
    PAGE: 400,
    STAFF: 70,
    AI_TEXT: 60_000_000, // 60.000.000 ký tự
    AI_IMAGE: 60_000, // 60.000 ảnh
    FAU: 1_600_000, // 1.600.000 FAU

    ...A_TIEN_PACKAGE_BASE,

    AI_SOUND: 60_000 * 60, // 60.000 phút
    AI_VIDEO: 6_000 * 60, // 6.000 phút

    APP: {
      INTEGRATE_3RD_SYSTEM: 1,
      APP_APPON: 10,
    },
  },

  // ------------------------------ gói BOT cũ ------------------------------ //
  /**gói unli chatbox cũ: tặng 1 năm gói unli chatbot */
  CHATBOT_UNLIMITED_1_YEAR: {
    DURATION: MONTH_IN_MS * 12, // 12 tháng
    ...CHATBOT_UNLIMITED_BASE,
  },
  /**gói unli chatbot tiêu chuẩn */
  CHATBOT_UNLIMITED_N_YEAR: {
    DURATION: UNLIMITED_VALUE, // không giới hạn thời gian
    ...CHATBOT_UNLIMITED_BASE,
  },
  /**gói chatbot lẻ 1 năm */
  CHATBOT_MARKETING_1_YEAR: {
    DURATION: MONTH_IN_MS * 12, // 12 tháng

    IS_NOT_RESET_QUOTA: true, // không reset quota

    PRICE: 3_480_000, // 3.480.000 VND

    PAGE: 1, // 1 trang
    STAFF: 10, // 10 nhân viên
    CLIENT: UNLIMITED_VALUE, // không giới hạn khách hàng

    FAU: 100_000, // 100.000 FAU (thực tế là không giới hạn, tạm thời để 100k)

    // không có AI
    AI_TEXT: 0,
    AI_IMAGE: 0,
    AI_SOUND: 0,
    AI_VIDEO: 0,

    ...EXTRA_BASE,
  },
  /**gói chatbot lẻ 1 năm có app */
  CHATBOT_LOYALTY_1_YEAR: {
    DURATION: MONTH_IN_MS * 12, // 12 tháng

    IS_NOT_RESET_QUOTA: true, // không reset quota

    PRICE: 6_708_000, // 6.708.000 VND

    PAGE: 1, // 1 trang
    STAFF: 10, // 10 nhân viên
    CLIENT: UNLIMITED_VALUE, // không giới hạn khách hàng

    FAU: 100_000, // 100.000 FAU (thực tế là không giới hạn, tạm thời để 100k)

    // không có AI
    AI_TEXT: 0,
    AI_IMAGE: 0,
    AI_SOUND: 0,
    AI_VIDEO: 0,

    ...EXTRA_BASE,
  },

  // ----------------------------- gói của Tuấn ----------------------------- //
  BUSINESS_TUAN_GIAY_BIG_SIZE: {
    PRICE: 4_160_000, // 4.160.000 VND -> 12 tháng: 49.920.000 VND
    DURATION: MONTH_IN_MS, // 1 tháng

    PAGE: 15,
    STAFF: 15,
    CLIENT: UNLIMITED_VALUE, // không giới hạn

    FAU: 500_000, // 500.000 FAU
    AI_TEXT: 15_000_000, // 15.000.000 ký tự
    AI_IMAGE: 15_000, // 15.000 ảnh
    AI_SOUND: 15_000 * 60, // 15.000 phút
    AI_VIDEO: 150 * 60, // 100 phút

    ...EXTRA_BASE,
  },
}

/**quản lý dữ liệu gói */
export interface IPackageManager {
  /**
   * lấy thông tin của gói
   * @param package_type tên gói
   */
  getInfo(package_type: OrgPackage): PackageInfo | undefined
}

/**quản lý dữ liệu gói */
@singleton()
export class PackageManager implements IPackageManager {
  getInfo(package_type: OrgPackage) {
    /**thông tin của gói */
    const PACKAGE = LIST_PACKAGE?.[package_type]

    // trả về thông tin gói
    return PACKAGE
  }
}
// TODO làm lại theo SOLID
