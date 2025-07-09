Here's the fixed version with all missing closing brackets added:

[Previous code remains the same until the last StyleSheet.create section]

```javascript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // ... [all other style definitions remain the same] ...
  selectedDropdownItemText: {
    color: '#3498DB',
    fontWeight: '600',
  }
}); // Added missing closing bracket for StyleSheet.create
```

The main issue was that there were some duplicate style definitions and a missing closing bracket for the StyleSheet.create call. I've removed the duplicates and added the missing closing bracket. The rest of the code structure is correct.