/**
 * FashionTON Wardrobe - Brand Size Charts Database
 * Comprehensive size charts for 10+ popular brands
 * Supports multiple regions: US, UK, EU
 */

/**
 * Size chart measurements structure:
 * - bust: in cm (chest circumference)
 * - waist: in cm (waist circumference)
 * - hips: in cm (hip circumference)
 * - height: in cm (optional, for length calculations)
 * - footLength: in cm (for shoes)
 */

const BRAND_CHARTS = {
  // ZARA - Fast fashion brand with standard sizing
  zara: {
    name: 'Zara',
    region: 'EU',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 } },
          { label: 'S', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 } },
          { label: 'M', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 } },
          { label: 'L', bust: { min: 94, max: 100 }, waist: { min: 74, max: 80 } },
          { label: 'XL', bust: { min: 100, max: 106 }, waist: { min: 80, max: 86 } },
          { label: 'XXL', bust: { min: 106, max: 112 }, waist: { min: 86, max: 92 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'S', waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'M', waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: 'L', waist: { min: 74, max: 80 }, hips: { min: 100, max: 106 } },
          { label: 'XL', waist: { min: 80, max: 86 }, hips: { min: 106, max: 112 } },
          { label: 'XXL', waist: { min: 86, max: 92 }, hips: { min: 112, max: 118 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'S', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'M', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: 'L', bust: { min: 94, max: 100 }, waist: { min: 74, max: 80 }, hips: { min: 100, max: 106 } },
          { label: 'XL', bust: { min: 100, max: 106 }, waist: { min: 80, max: 86 }, hips: { min: 106, max: 112 } },
          { label: 'XXL', bust: { min: 106, max: 112 }, waist: { min: 86, max: 92 }, hips: { min: 112, max: 118 } }
        ]
      },
      shoes: {
        unit: 'eu',
        sizes: [
          { label: '35', footLength: { min: 22.0, max: 22.4 } },
          { label: '36', footLength: { min: 22.5, max: 23.0 } },
          { label: '37', footLength: { min: 23.1, max: 23.5 } },
          { label: '38', footLength: { min: 23.6, max: 24.0 } },
          { label: '39', footLength: { min: 24.1, max: 24.5 } },
          { label: '40', footLength: { min: 24.6, max: 25.0 } },
          { label: '41', footLength: { min: 25.1, max: 25.5 } },
          { label: '42', footLength: { min: 25.6, max: 26.0 } },
          { label: '43', footLength: { min: 26.1, max: 26.5 } },
          { label: '44', footLength: { min: 26.6, max: 27.0 } }
        ]
      }
    }
  },

  // H&M - European sizing with numeric conversions
  hm: {
    name: 'H&M',
    region: 'EU',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 80, max: 84 }, waist: { min: 60, max: 64 } },
          { label: 'S', bust: { min: 84, max: 88 }, waist: { min: 64, max: 68 } },
          { label: 'M', bust: { min: 88, max: 96 }, waist: { min: 68, max: 76 } },
          { label: 'L', bust: { min: 96, max: 104 }, waist: { min: 76, max: 84 } },
          { label: 'XL', bust: { min: 104, max: 112 }, waist: { min: 84, max: 92 } },
          { label: 'XXL', bust: { min: 112, max: 120 }, waist: { min: 92, max: 100 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 60, max: 64 }, hips: { min: 86, max: 90 } },
          { label: 'S', waist: { min: 64, max: 68 }, hips: { min: 90, max: 94 } },
          { label: 'M', waist: { min: 68, max: 76 }, hips: { min: 94, max: 102 } },
          { label: 'L', waist: { min: 76, max: 84 }, hips: { min: 102, max: 110 } },
          { label: 'XL', waist: { min: 84, max: 92 }, hips: { min: 110, max: 118 } },
          { label: 'XXL', waist: { min: 92, max: 100 }, hips: { min: 118, max: 126 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 80, max: 84 }, waist: { min: 60, max: 64 }, hips: { min: 86, max: 90 } },
          { label: 'S', bust: { min: 84, max: 88 }, waist: { min: 64, max: 68 }, hips: { min: 90, max: 94 } },
          { label: 'M', bust: { min: 88, max: 96 }, waist: { min: 68, max: 76 }, hips: { min: 94, max: 102 } },
          { label: 'L', bust: { min: 96, max: 104 }, waist: { min: 76, max: 84 }, hips: { min: 102, max: 110 } },
          { label: 'XL', bust: { min: 104, max: 112 }, waist: { min: 84, max: 92 }, hips: { min: 110, max: 118 } },
          { label: 'XXL', bust: { min: 112, max: 120 }, waist: { min: 92, max: 100 }, hips: { min: 118, max: 126 } }
        ]
      },
      shoes: {
        unit: 'eu',
        sizes: [
          { label: '35', footLength: { min: 22.0, max: 22.4 } },
          { label: '36', footLength: { min: 22.5, max: 23.0 } },
          { label: '37', footLength: { min: 23.1, max: 23.5 } },
          { label: '38', footLength: { min: 23.6, max: 24.0 } },
          { label: '39', footLength: { min: 24.1, max: 24.5 } },
          { label: '40', footLength: { min: 24.6, max: 25.0 } },
          { label: '41', footLength: { min: 25.1, max: 25.5 } },
          { label: '42', footLength: { min: 25.6, max: 26.0 } },
          { label: '43', footLength: { min: 26.1, max: 26.5 } },
          { label: '44', footLength: { min: 26.6, max: 27.0 } }
        ]
      }
    }
  },

  // UNIQLO - Asian sizing (runs smaller)
  uniqlo: {
    name: 'Uniqlo',
    region: 'JP',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 78, max: 82 }, waist: { min: 58, max: 62 } },
          { label: 'S', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 } },
          { label: 'M', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 } },
          { label: 'L', bust: { min: 90, max: 96 }, waist: { min: 70, max: 76 } },
          { label: 'XL', bust: { min: 96, max: 102 }, waist: { min: 76, max: 82 } },
          { label: 'XXL', bust: { min: 102, max: 108 }, waist: { min: 82, max: 88 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 58, max: 62 }, hips: { min: 84, max: 88 } },
          { label: 'S', waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'M', waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'L', waist: { min: 70, max: 76 }, hips: { min: 96, max: 102 } },
          { label: 'XL', waist: { min: 76, max: 82 }, hips: { min: 102, max: 108 } },
          { label: 'XXL', waist: { min: 82, max: 88 }, hips: { min: 108, max: 114 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 78, max: 82 }, waist: { min: 58, max: 62 }, hips: { min: 84, max: 88 } },
          { label: 'S', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'M', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'L', bust: { min: 90, max: 96 }, waist: { min: 70, max: 76 }, hips: { min: 96, max: 102 } },
          { label: 'XL', bust: { min: 96, max: 102 }, waist: { min: 76, max: 82 }, hips: { min: 102, max: 108 } },
          { label: 'XXL', bust: { min: 102, max: 108 }, waist: { min: 82, max: 88 }, hips: { min: 108, max: 114 } }
        ]
      },
      shoes: {
        unit: 'jp',
        sizes: [
          { label: '22.0', footLength: { min: 21.5, max: 22.0 } },
          { label: '22.5', footLength: { min: 22.1, max: 22.5 } },
          { label: '23.0', footLength: { min: 22.6, max: 23.0 } },
          { label: '23.5', footLength: { min: 23.1, max: 23.5 } },
          { label: '24.0', footLength: { min: 23.6, max: 24.0 } },
          { label: '24.5', footLength: { min: 24.1, max: 24.5 } },
          { label: '25.0', footLength: { min: 24.6, max: 25.0 } },
          { label: '25.5', footLength: { min: 25.1, max: 25.5 } },
          { label: '26.0', footLength: { min: 25.6, max: 26.0 } },
          { label: '26.5', footLength: { min: 26.1, max: 26.5 } },
          { label: '27.0', footLength: { min: 26.6, max: 27.0 } }
        ]
      }
    }
  },

  // NIKE - Athletic wear sizing
  nike: {
    name: 'Nike',
    region: 'US',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 80, max: 84 }, waist: { min: 60, max: 64 } },
          { label: 'S', bust: { min: 84, max: 88 }, waist: { min: 64, max: 68 } },
          { label: 'M', bust: { min: 88, max: 92 }, waist: { min: 68, max: 72 } },
          { label: 'L', bust: { min: 92, max: 100 }, waist: { min: 72, max: 80 } },
          { label: 'XL', bust: { min: 100, max: 108 }, waist: { min: 80, max: 88 } },
          { label: 'XXL', bust: { min: 108, max: 116 }, waist: { min: 88, max: 96 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 60, max: 64 }, hips: { min: 84, max: 88 } },
          { label: 'S', waist: { min: 64, max: 68 }, hips: { min: 88, max: 92 } },
          { label: 'M', waist: { min: 68, max: 72 }, hips: { min: 92, max: 96 } },
          { label: 'L', waist: { min: 72, max: 80 }, hips: { min: 96, max: 104 } },
          { label: 'XL', waist: { min: 80, max: 88 }, hips: { min: 104, max: 112 } },
          { label: 'XXL', waist: { min: 88, max: 96 }, hips: { min: 112, max: 120 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 80, max: 84 }, waist: { min: 60, max: 64 }, hips: { min: 84, max: 88 } },
          { label: 'S', bust: { min: 84, max: 88 }, waist: { min: 64, max: 68 }, hips: { min: 88, max: 92 } },
          { label: 'M', bust: { min: 88, max: 92 }, waist: { min: 68, max: 72 }, hips: { min: 92, max: 96 } },
          { label: 'L', bust: { min: 92, max: 100 }, waist: { min: 72, max: 80 }, hips: { min: 96, max: 104 } },
          { label: 'XL', bust: { min: 100, max: 108 }, waist: { min: 80, max: 88 }, hips: { min: 104, max: 112 } },
          { label: 'XXL', bust: { min: 108, max: 116 }, waist: { min: 88, max: 96 }, hips: { min: 112, max: 120 } }
        ]
      },
      shoes: {
        unit: 'us',
        sizes: [
          { label: '5', footLength: { min: 21.6, max: 22.0 } },
          { label: '6', footLength: { min: 22.1, max: 22.5 } },
          { label: '7', footLength: { min: 22.6, max: 23.5 } },
          { label: '8', footLength: { min: 23.6, max: 24.0 } },
          { label: '9', footLength: { min: 24.1, max: 25.0 } },
          { label: '10', footLength: { min: 25.1, max: 25.5 } },
          { label: '11', footLength: { min: 25.6, max: 26.5 } },
          { label: '12', footLength: { min: 26.6, max: 27.0 } },
          { label: '13', footLength: { min: 27.1, max: 27.5 } }
        ]
      }
    }
  },

  // ADIDAS - Athletic wear, similar to Nike
  adidas: {
    name: 'Adidas',
    region: 'US',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 } },
          { label: 'S', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 } },
          { label: 'M', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 } },
          { label: 'L', bust: { min: 94, max: 102 }, waist: { min: 74, max: 82 } },
          { label: 'XL', bust: { min: 102, max: 110 }, waist: { min: 82, max: 90 } },
          { label: 'XXL', bust: { min: 110, max: 118 }, waist: { min: 90, max: 98 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 62, max: 66 }, hips: { min: 86, max: 90 } },
          { label: 'S', waist: { min: 66, max: 70 }, hips: { min: 90, max: 94 } },
          { label: 'M', waist: { min: 70, max: 74 }, hips: { min: 94, max: 98 } },
          { label: 'L', waist: { min: 74, max: 82 }, hips: { min: 98, max: 106 } },
          { label: 'XL', waist: { min: 82, max: 90 }, hips: { min: 106, max: 114 } },
          { label: 'XXL', waist: { min: 90, max: 98 }, hips: { min: 114, max: 122 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 }, hips: { min: 86, max: 90 } },
          { label: 'S', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 }, hips: { min: 90, max: 94 } },
          { label: 'M', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 }, hips: { min: 94, max: 98 } },
          { label: 'L', bust: { min: 94, max: 102 }, waist: { min: 74, max: 82 }, hips: { min: 98, max: 106 } },
          { label: 'XL', bust: { min: 102, max: 110 }, waist: { min: 82, max: 90 }, hips: { min: 106, max: 114 } },
          { label: 'XXL', bust: { min: 110, max: 118 }, waist: { min: 90, max: 98 }, hips: { min: 114, max: 122 } }
        ]
      },
      shoes: {
        unit: 'us',
        sizes: [
          { label: '5', footLength: { min: 21.6, max: 22.0 } },
          { label: '6', footLength: { min: 22.1, max: 22.5 } },
          { label: '7', footLength: { min: 22.6, max: 23.5 } },
          { label: '8', footLength: { min: 23.6, max: 24.0 } },
          { label: '9', footLength: { min: 24.1, max: 25.0 } },
          { label: '10', footLength: { min: 25.1, max: 25.5 } },
          { label: '11', footLength: { min: 25.6, max: 26.5 } },
          { label: '12', footLength: { min: 26.6, max: 27.0 } }
        ]
      }
    }
  },

  // ASOS - UK-based online retailer
  asos: {
    name: 'ASOS',
    region: 'UK',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: '4', bust: { min: 78, max: 80 }, waist: { min: 58, max: 60 } },
          { label: '6', bust: { min: 80, max: 82 }, waist: { min: 60, max: 62 } },
          { label: '8', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 } },
          { label: '10', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 } },
          { label: '12', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 } },
          { label: '14', bust: { min: 94, max: 98 }, waist: { min: 74, max: 78 } },
          { label: '16', bust: { min: 98, max: 102 }, waist: { min: 78, max: 82 } },
          { label: '18', bust: { min: 102, max: 106 }, waist: { min: 82, max: 86 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: '4', waist: { min: 58, max: 60 }, hips: { min: 84, max: 86 } },
          { label: '6', waist: { min: 60, max: 62 }, hips: { min: 86, max: 88 } },
          { label: '8', waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: '10', waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: '12', waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: '14', waist: { min: 74, max: 78 }, hips: { min: 100, max: 104 } },
          { label: '16', waist: { min: 78, max: 82 }, hips: { min: 104, max: 108 } },
          { label: '18', waist: { min: 82, max: 86 }, hips: { min: 108, max: 112 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: '4', bust: { min: 78, max: 80 }, waist: { min: 58, max: 60 }, hips: { min: 84, max: 86 } },
          { label: '6', bust: { min: 80, max: 82 }, waist: { min: 60, max: 62 }, hips: { min: 86, max: 88 } },
          { label: '8', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: '10', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: '12', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: '14', bust: { min: 94, max: 98 }, waist: { min: 74, max: 78 }, hips: { min: 100, max: 104 } },
          { label: '16', bust: { min: 98, max: 102 }, waist: { min: 78, max: 82 }, hips: { min: 104, max: 108 } },
          { label: '18', bust: { min: 102, max: 106 }, waist: { min: 82, max: 86 }, hips: { min: 108, max: 112 } }
        ]
      },
      shoes: {
        unit: 'uk',
        sizes: [
          { label: '3', footLength: { min: 22.0, max: 22.4 } },
          { label: '4', footLength: { min: 22.5, max: 23.0 } },
          { label: '5', footLength: { min: 23.1, max: 23.5 } },
          { label: '6', footLength: { min: 23.6, max: 24.0 } },
          { label: '7', footLength: { min: 24.1, max: 24.5 } },
          { label: '8', footLength: { min: 24.6, max: 25.0 } },
          { label: '9', footLength: { min: 25.1, max: 25.5 } },
          { label: '10', footLength: { min: 25.6, max: 26.0 } }
        ]
      }
    }
  },

  // SHEIN - Fast fashion, tends to run small
  shein: {
    name: 'Shein',
    region: 'CN',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 78, max: 82 }, waist: { min: 58, max: 62 } },
          { label: 'S', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 } },
          { label: 'M', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 } },
          { label: 'L', bust: { min: 90, max: 96 }, waist: { min: 70, max: 76 } },
          { label: 'XL', bust: { min: 96, max: 102 }, waist: { min: 76, max: 82 } },
          { label: 'XXL', bust: { min: 102, max: 108 }, waist: { min: 82, max: 88 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 58, max: 62 }, hips: { min: 84, max: 88 } },
          { label: 'S', waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'M', waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'L', waist: { min: 70, max: 76 }, hips: { min: 96, max: 102 } },
          { label: 'XL', waist: { min: 76, max: 82 }, hips: { min: 102, max: 108 } },
          { label: 'XXL', waist: { min: 82, max: 88 }, hips: { min: 108, max: 114 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 78, max: 82 }, waist: { min: 58, max: 62 }, hips: { min: 84, max: 88 } },
          { label: 'S', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'M', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'L', bust: { min: 90, max: 96 }, waist: { min: 70, max: 76 }, hips: { min: 96, max: 102 } },
          { label: 'XL', bust: { min: 96, max: 102 }, waist: { min: 76, max: 82 }, hips: { min: 102, max: 108 } },
          { label: 'XXL', bust: { min: 102, max: 108 }, waist: { min: 82, max: 88 }, hips: { min: 108, max: 114 } }
        ]
      },
      shoes: {
        unit: 'eu',
        sizes: [
          { label: '35', footLength: { min: 22.0, max: 22.4 } },
          { label: '36', footLength: { min: 22.5, max: 23.0 } },
          { label: '37', footLength: { min: 23.1, max: 23.5 } },
          { label: '38', footLength: { min: 23.6, max: 24.0 } },
          { label: '39', footLength: { min: 24.1, max: 24.5 } },
          { label: '40', footLength: { min: 24.6, max: 25.0 } },
          { label: '41', footLength: { min: 25.1, max: 25.5 } },
          { label: '42', footLength: { min: 25.6, max: 26.0 } }
        ]
      }
    }
  },

  // MANGO - Spanish fashion brand
  mango: {
    name: 'Mango',
    region: 'EU',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 } },
          { label: 'S', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 } },
          { label: 'M', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 } },
          { label: 'L', bust: { min: 94, max: 100 }, waist: { min: 74, max: 80 } },
          { label: 'XL', bust: { min: 100, max: 106 }, waist: { min: 80, max: 86 } },
          { label: 'XXL', bust: { min: 106, max: 112 }, waist: { min: 86, max: 92 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'S', waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'M', waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: 'L', waist: { min: 74, max: 80 }, hips: { min: 100, max: 106 } },
          { label: 'XL', waist: { min: 80, max: 86 }, hips: { min: 106, max: 112 } },
          { label: 'XXL', waist: { min: 86, max: 92 }, hips: { min: 112, max: 118 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'S', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'M', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: 'L', bust: { min: 94, max: 100 }, waist: { min: 74, max: 80 }, hips: { min: 100, max: 106 } },
          { label: 'XL', bust: { min: 100, max: 106 }, waist: { min: 80, max: 86 }, hips: { min: 106, max: 112 } },
          { label: 'XXL', bust: { min: 106, max: 112 }, waist: { min: 86, max: 92 }, hips: { min: 112, max: 118 } }
        ]
      },
      shoes: {
        unit: 'eu',
        sizes: [
          { label: '35', footLength: { min: 22.0, max: 22.4 } },
          { label: '36', footLength: { min: 22.5, max: 23.0 } },
          { label: '37', footLength: { min: 23.1, max: 23.5 } },
          { label: '38', footLength: { min: 23.6, max: 24.0 } },
          { label: '39', footLength: { min: 24.1, max: 24.5 } },
          { label: '40', footLength: { min: 24.6, max: 25.0 } },
          { label: '41', footLength: { min: 25.1, max: 25.5 } },
          { label: '42', footLength: { min: 25.6, max: 26.0 } }
        ]
      }
    }
  },

  // TOPSHOP - UK high street brand
  topshop: {
    name: 'Topshop',
    region: 'UK',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: '4', bust: { min: 78, max: 80 }, waist: { min: 58, max: 60 } },
          { label: '6', bust: { min: 80, max: 82 }, waist: { min: 60, max: 62 } },
          { label: '8', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 } },
          { label: '10', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 } },
          { label: '12', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 } },
          { label: '14', bust: { min: 94, max: 98 }, waist: { min: 74, max: 78 } },
          { label: '16', bust: { min: 98, max: 102 }, waist: { min: 78, max: 82 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: '4', waist: { min: 58, max: 60 }, hips: { min: 84, max: 86 } },
          { label: '6', waist: { min: 60, max: 62 }, hips: { min: 86, max: 88 } },
          { label: '8', waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: '10', waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: '12', waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: '14', waist: { min: 74, max: 78 }, hips: { min: 100, max: 104 } },
          { label: '16', waist: { min: 78, max: 82 }, hips: { min: 104, max: 108 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: '4', bust: { min: 78, max: 80 }, waist: { min: 58, max: 60 }, hips: { min: 84, max: 86 } },
          { label: '6', bust: { min: 80, max: 82 }, waist: { min: 60, max: 62 }, hips: { min: 86, max: 88 } },
          { label: '8', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: '10', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: '12', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: '14', bust: { min: 94, max: 98 }, waist: { min: 74, max: 78 }, hips: { min: 100, max: 104 } },
          { label: '16', bust: { min: 98, max: 102 }, waist: { min: 78, max: 82 }, hips: { min: 104, max: 108 } }
        ]
      },
      shoes: {
        unit: 'uk',
        sizes: [
          { label: '3', footLength: { min: 22.0, max: 22.4 } },
          { label: '4', footLength: { min: 22.5, max: 23.0 } },
          { label: '5', footLength: { min: 23.1, max: 23.5 } },
          { label: '6', footLength: { min: 23.6, max: 24.0 } },
          { label: '7', footLength: { min: 24.1, max: 24.5 } },
          { label: '8', footLength: { min: 24.6, max: 25.0 } },
          { label: '9', footLength: { min: 25.1, max: 25.5 } }
        ]
      }
    }
  },

  // FOREVER 21 - US fast fashion
  forever21: {
    name: 'Forever 21',
    region: 'US',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 } },
          { label: 'S', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 } },
          { label: 'M', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 } },
          { label: 'L', bust: { min: 94, max: 100 }, waist: { min: 74, max: 80 } },
          { label: 'XL', bust: { min: 100, max: 106 }, waist: { min: 80, max: 86 } },
          { label: 'XXL', bust: { min: 106, max: 112 }, waist: { min: 86, max: 92 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'S', waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'M', waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: 'L', waist: { min: 74, max: 80 }, hips: { min: 100, max: 106 } },
          { label: 'XL', waist: { min: 80, max: 86 }, hips: { min: 106, max: 112 } },
          { label: 'XXL', waist: { min: 86, max: 92 }, hips: { min: 112, max: 118 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'S', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'M', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: 'L', bust: { min: 94, max: 100 }, waist: { min: 74, max: 80 }, hips: { min: 100, max: 106 } },
          { label: 'XL', bust: { min: 100, max: 106 }, waist: { min: 80, max: 86 }, hips: { min: 106, max: 112 } },
          { label: 'XXL', bust: { min: 106, max: 112 }, waist: { min: 86, max: 92 }, hips: { min: 112, max: 118 } }
        ]
      },
      shoes: {
        unit: 'us',
        sizes: [
          { label: '5', footLength: { min: 21.6, max: 22.0 } },
          { label: '6', footLength: { min: 22.1, max: 22.5 } },
          { label: '7', footLength: { min: 22.6, max: 23.5 } },
          { label: '8', footLength: { min: 23.6, max: 24.0 } },
          { label: '9', footLength: { min: 24.1, max: 25.0 } },
          { label: '10', footLength: { min: 25.1, max: 25.5 } }
        ]
      }
    }
  },

  // GAP - Classic American brand
  gap: {
    name: 'GAP',
    region: 'US',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 } },
          { label: 'S', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 } },
          { label: 'M', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 } },
          { label: 'L', bust: { min: 94, max: 100 }, waist: { min: 74, max: 80 } },
          { label: 'XL', bust: { min: 100, max: 106 }, waist: { min: 80, max: 86 } },
          { label: 'XXL', bust: { min: 106, max: 112 }, waist: { min: 86, max: 92 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'S', waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'M', waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: 'L', waist: { min: 74, max: 80 }, hips: { min: 100, max: 106 } },
          { label: 'XL', waist: { min: 80, max: 86 }, hips: { min: 106, max: 112 } },
          { label: 'XXL', waist: { min: 86, max: 92 }, hips: { min: 112, max: 118 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'S', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'M', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: 'L', bust: { min: 94, max: 100 }, waist: { min: 74, max: 80 }, hips: { min: 100, max: 106 } },
          { label: 'XL', bust: { min: 100, max: 106 }, waist: { min: 80, max: 86 }, hips: { min: 106, max: 112 } },
          { label: 'XXL', bust: { min: 106, max: 112 }, waist: { min: 86, max: 92 }, hips: { min: 112, max: 118 } }
        ]
      },
      shoes: {
        unit: 'us',
        sizes: [
          { label: '5', footLength: { min: 21.6, max: 22.0 } },
          { label: '6', footLength: { min: 22.1, max: 22.5 } },
          { label: '7', footLength: { min: 22.6, max: 23.5 } },
          { label: '8', footLength: { min: 23.6, max: 24.0 } },
          { label: '9', footLength: { min: 24.1, max: 25.0 } },
          { label: '10', footLength: { min: 25.1, max: 25.5 } },
          { label: '11', footLength: { min: 25.6, max: 26.5 } }
        ]
      }
    }
  }
};

/**
 * Get all available brands
 * @returns {Array} - List of brand keys and names
 */
function getAvailableBrands() {
  return Object.entries(BRAND_CHARTS).map(([key, data]) => ({
    key,
    name: data.name,
    region: data.region,
    categories: Object.keys(data.categories)
  }));
}

/**
 * Get brand data
 * @param {string} brandKey - Brand identifier
 * @returns {Object|null} - Brand data or null
 */
function getBrand(brandKey) {
  return BRAND_CHARTS[brandKey.toLowerCase()] || null;
}

/**
 * Get size chart for a specific brand and category
 * @param {string} brandKey - Brand identifier
 * @param {string} category - Category name
 * @returns {Object|null} - Size chart or null
 */
function getSizeChart(brandKey, category) {
  const brand = BRAND_CHARTS[brandKey.toLowerCase()];
  if (!brand) return null;
  return brand.categories[category.toLowerCase()] || null;
}

/**
 * Check if brand and category combination exists
 * @param {string} brandKey - Brand identifier
 * @param {string} category - Category name
 * @returns {boolean}
 */
function hasSizeChart(brandKey, category) {
  const brand = BRAND_CHARTS[brandKey.toLowerCase()];
  if (!brand) return false;
  return !!brand.categories[category.toLowerCase()];
}

/**
 * Get supported categories
 * @returns {Array} - List of supported categories
 */
function getSupportedCategories() {
  return ['tops', 'bottoms', 'dresses', 'shoes'];
}

/**
 * Format size chart for API response
 * @param {string} brandKey - Brand identifier
 * @param {string} category - Category name
 * @returns {Object|null} - Formatted size chart
 */
function formatSizeChartForResponse(brandKey, category) {
  const chart = getSizeChart(brandKey, category);
  if (!chart) return null;

  const formatted = {};
  chart.sizes.forEach(size => {
    formatted[size.label] = {};
    if (size.bust) {
      formatted[size.label].bust = `${size.bust.min}-${size.bust.max}`;
    }
    if (size.waist) {
      formatted[size.label].waist = `${size.waist.min}-${size.waist.max}`;
    }
    if (size.hips) {
      formatted[size.label].hips = `${size.hips.min}-${size.hips.max}`;
    }
    if (size.footLength) {
      formatted[size.label].footLength = `${size.footLength.min}-${size.footLength.max}`;
    }
  });

  return formatted;
}

module.exports = {
  BRAND_CHARTS,
  getAvailableBrands,
  getBrand,
  getSizeChart,
  hasSizeChart,
  getSupportedCategories,
  formatSizeChartForResponse
};
