<FormField
  control={form.control}
  name="description"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t("products.description")}</FormLabel>
      <FormControl>
        <Textarea
          placeholder={t("products.descriptionPlaceholder")}
          className="min-h-[200px] resize-none"
          {...field}
        />
      </FormControl>
      <FormDescription>{t("products.descriptionHelp")}</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>;
