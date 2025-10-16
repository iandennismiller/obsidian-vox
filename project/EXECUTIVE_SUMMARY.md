# Whisper.cpp Integration - Executive Summary

## Project Overview
This project replaces the current transcription backend in Obsidian Vox with whisper.cpp server, providing users with a self-hosted transcription solution.

## Key Findings

### Current State
- Plugin uses a custom backend API at `/transcribe` endpoint
- Sends audio files with `audio_file` form field
- Response contains text, language, and segments in array format
- Requires API keys for authentication

### Target State
- Plugin will use whisper.cpp server `/inference` endpoint
- Sends audio files with `file` form field plus additional parameters
- Response contains same core data but in enhanced object format
- Self-hosted instances don't require API keys

### Why This Change Is Low Risk
1. **Response Format Compatibility**: The code already handles object-format segments
2. **Minimal Code Changes**: Only 3 files need modification
3. **Backward Compatible Types**: New fields are optional additions
4. **Existing Error Handling**: Current error handling covers new scenarios

## Required Changes

### Critical Changes (Must Have)
1. **Update API endpoint** in `TranscriptionProcessor`
   - Change URL from `/transcribe` to `/inference`
   - Change form field from `audio_file` to `file`
   - Add required parameters: `temperature`, `temperature_inc`, `response_format`

2. **Update Type Definitions** in `types.ts`
   - Add optional fields to `TranscriptionResponse`
   - Add `TranscriptionWord` type for word-level data
   - Update `TranscriptionSegment` to include optional `words` array

3. **Update Settings** in `settings/index.ts`
   - Add `temperature` and `temperatureInc` settings
   - Provide sensible defaults ("0.0" and "0.2")
   - Add UI controls in settings tab

### Optional Changes (Nice to Have)
1. **Settings UI Enhancement**
   - Add advanced whisper settings section
   - Include tooltips and help text
   - Add response format selector

2. **Documentation Updates**
   - Update README with whisper.cpp setup
   - Add troubleshooting guide
   - Create migration guide for users

## Implementation Approach

### Phase 1: Core Integration (Day 1)
- Update type definitions
- Modify API call in TranscriptionProcessor
- Add basic settings with defaults
- Test with local whisper.cpp server

### Phase 2: Settings UI (Day 1-2)
- Add settings controls
- Add validation
- Test settings persistence

### Phase 3: Documentation (Day 2)
- Update README
- Create setup guide
- Document API changes

### Phase 4: Testing & Validation (Day 2-3)
- Manual testing with various audio files
- Error scenario testing
- Performance validation

## Files to Modify

| File | Lines Changed | Complexity | Risk |
|------|---------------|------------|------|
| `src/types.ts` | ~30 | Low | Low |
| `src/TranscriptionProcessor/index.ts` | ~20 | Low | Medium |
| `src/settings/index.ts` | ~60 | Medium | Low |
| `README.md` | ~50 | Low | Low |

**Total Estimated Changes**: ~160 lines of code

## Benefits

### For Users
- ✓ **Privacy**: Audio stays on local machine
- ✓ **No Limits**: Unlimited transcriptions
- ✓ **No Cost**: No API subscription fees
- ✓ **Control**: Choose models and parameters
- ✓ **Better Features**: Word timestamps, language detection

### For Developers
- ✓ **Simpler Backend**: No API key management needed (for self-hosted)
- ✓ **Open Source**: Can contribute to whisper.cpp
- ✓ **Flexible**: Support multiple backends possible
- ✓ **Maintainable**: Fewer dependencies on external services

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing users | High | Low | Keep API key settings, add migration guide |
| Server setup complexity | Medium | Medium | Provide clear documentation |
| Performance issues | Low | Low | Whisper.cpp is well-optimized |
| Compatibility issues | Medium | Low | Test thoroughly with various audio formats |

## Dependencies

### User Requirements
- whisper.cpp compiled and installed
- Model files downloaded
- Server running and accessible

### Technical Requirements
- No new npm packages needed
- Existing axios library handles requests
- TypeScript types are sufficient

## Success Criteria

1. ✅ Plugin successfully transcribes audio via whisper.cpp server
2. ✅ All existing features continue to work
3. ✅ Settings allow customization of whisper parameters
4. ✅ Error messages are clear and helpful
5. ✅ Documentation enables users to self-host
6. ✅ Code changes are minimal and maintainable

## Timeline Estimate

- **Day 1**: Core implementation and basic testing (4-6 hours)
- **Day 2**: Settings UI and documentation (3-4 hours)
- **Day 3**: Testing and refinement (2-3 hours)

**Total**: 9-13 hours of development time

## Recommendation

**Proceed with implementation** using the phased approach outlined above. The changes are:
- Low risk (minimal code modification)
- High value (significant user benefits)
- Well scoped (clear requirements)
- Technically sound (compatible formats)

## Next Steps

1. Review and approve planning documents
2. Set up test environment with whisper.cpp server
3. Begin Phase 1 implementation
4. Test incrementally after each phase
5. Document changes as you go
6. Prepare release notes

## Questions to Resolve

1. Should we maintain support for the old public API endpoint?
   - **Recommendation**: Yes, for backward compatibility
   
2. Should temperature settings be exposed to users?
   - **Recommendation**: Yes, with good defaults
   
3. Should we add language override option?
   - **Recommendation**: Future enhancement, not MVP

4. Should we display word-level timestamps in markdown?
   - **Recommendation**: Future enhancement, not MVP

## Resources

- **whisper.cpp GitHub**: https://github.com/ggerganov/whisper.cpp
- **API Documentation**: See TECHNICAL_SPEC.md
- **Migration Guide**: See MIGRATION_GUIDE.md
- **Implementation Plan**: See IMPLEMENTATION_PLAN.md
