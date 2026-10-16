namespace HMS.Models;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("menu_categories")]
public class MenuCategory
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required, MaxLength(100)]
    [Column("name")]
    public string Name { get; set; } = string.Empty; // "Starters", "Main Course", "Biryani & Rice", "Breads & Roti", "Desserts", "Beverages"
    
    [Column("display_order")]
    public int DisplayOrder { get; set; } = 0;
    
    public ICollection<MenuItem> Items { get; set; } = new List<MenuItem>();
}

