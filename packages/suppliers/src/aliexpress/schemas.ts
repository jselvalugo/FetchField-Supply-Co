import { z } from "zod";

/**
 * Zod schemas for the AliExpress DS responses we consume. They are strict
 * about the fields we rely on and ignore the rest. If AliExpress changes a
 * field we use, the parse fails and the sync reports `invalid_response`
 * instead of writing a wrong price or stock level.
 *
 * Numbers often arrive as strings, so they're coerced.
 */
const num = z.coerce.number().finite();
const optNum = z.union([z.coerce.number().finite(), z.literal("")]).optional().transform((v) => (v === "" ? undefined : v));

/** AliExpress wraps lists as { some_d_t_o: [...] } and sometimes sends a single object. */
const listOf = <T extends z.ZodTypeAny>(key: string, item: T) =>
  z
    .record(z.string(), z.unknown())
    .optional()
    .transform((wrapper, ctx): z.infer<T>[] => {
      const inner = wrapper?.[key];
      if (inner === undefined || inner === null) return [];
      const arr = Array.isArray(inner) ? inner : [inner];
      const out: z.infer<T>[] = [];
      for (const el of arr) {
        const p = item.safeParse(el);
        if (!p.success) {
          ctx.addIssue({ code: "custom", message: `bad ${key}: ${p.error.issues[0]?.message ?? "invalid"}` });
          return z.NEVER;
        }
        out.push(p.data);
      }
      return out;
    });

export const SkuProperty = z.object({
  sku_property_name: z.string().optional(),
  sku_property_value: z.string().optional(),
  property_value_definition_name: z.string().optional(),
});

export const Sku = z.object({
  sku_id: z.union([z.string(), z.number()]).transform(String),
  sku_attr: z.string().default(""),
  offer_sale_price: z.union([z.string(), z.number()]).optional(),
  sku_price: z.union([z.string(), z.number()]).optional(),
  sku_available_stock: optNum,
  currency_code: z.string().optional(),
  ae_sku_property_dtos: listOf("ae_sku_property_d_t_o", SkuProperty),
});

export const ProductGetResult = z.object({
  ae_item_base_info_dto: z.object({
    product_id: z.union([z.string(), z.number()]).transform(String),
    subject: z.string(),
    detail: z.string().optional().default(""),
    product_status_type: z.string().optional(),
    currency_code: z.string().optional(),
  }),
  ae_item_sku_info_dtos: listOf("ae_item_sku_info_d_t_o", Sku),
  ae_multimedia_info_dto: z.object({ image_urls: z.string().optional().default("") }).optional(),
  package_info_dto: z
    .object({
      package_length: optNum,
      package_width: optNum,
      package_height: optNum,
      gross_weight: optNum,
    })
    .optional(),
  logistics_info_dto: z.object({ delivery_time: optNum, ship_to_country: z.string().optional() }).optional(),
  ae_store_info: z
    .object({
      store_id: z.union([z.string(), z.number()]).transform(String),
      store_name: z.string().default(""),
      item_as_described_rating: optNum,
    })
    .optional(),
});

export const ProductGetResponse = z.object({
  aliexpress_ds_product_get_response: z.object({
    result: ProductGetResult,
    rsp_code: z.union([z.string(), z.number()]).optional(),
  }),
});

export const DeliveryOption = z.object({
  code: z.string(),
  company: z.string().optional(),
  shipping_fee_cent: z.union([z.string(), z.number()]).optional(),
  shipping_fee_currency: z.string().optional(),
  free_shipping: z.union([z.boolean(), z.string()]).optional(),
  min_delivery_days: optNum,
  max_delivery_days: optNum,
  tracking: z.union([z.boolean(), z.string()]).optional(),
});

export const FreightResponse = z.object({
  aliexpress_ds_freight_query_response: z.object({
    result: z.object({
      success: z.union([z.boolean(), z.string()]).optional(),
      delivery_options: listOf("delivery_option_d_t_o", DeliveryOption),
    }),
  }),
});

export const OrderCreateResponse = z.object({
  aliexpress_ds_order_create_response: z.object({
    result: z.object({
      is_success: z.union([z.boolean(), z.string()]).transform((v) => v === true || v === "true"),
      order_list: z
        .object({ number: z.array(z.union([z.string(), z.number()]).transform(String)).default([]) })
        .optional(),
      error_code: z.string().optional(),
      error_msg: z.string().optional(),
    }),
  }),
});

export const OrderGetResponse = z.object({
  aliexpress_ds_trade_order_get_response: z.object({
    result: z.object({
      order_status: z.string(),
      logistics_info_list: listOf(
        "ae_order_logistics_info",
        z.object({
          logistics_no: z.string().optional(),
          logistics_service: z.string().optional(),
        }),
      ),
      gmt_create: z.string().optional(),
    }),
  }),
});
